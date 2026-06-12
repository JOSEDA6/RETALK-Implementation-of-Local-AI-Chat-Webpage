"""
数据库配置模块 (database)

@description 创建异步 SQLAlchemy 引擎和会话工厂，并对 SQLite 进行
             WAL 模式 / 超时 / 同步策略等性能优化。
@author 施乔
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import event

from .config import settings

# ---------------------------------------------------------------------------
# 异步数据库引擎
# ---------------------------------------------------------------------------
# engine 就是和数据库之间的"连接管理器"，所有 SQL 都通过它执行。
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,       # True 会在控制台打印所有 SQL，调试时可开启
    future=True,      # 使用 SQLAlchemy 2.x 风格 API
)


# ---------------------------------------------------------------------------
# SQLite PRAGMA 优化（每次新建物理连接时自动执行）
# ---------------------------------------------------------------------------

@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """为每个新建的 SQLite 连接设置性能优化 PRAGMA。

    Args:
        dbapi_connection: 底层 DBAPI 连接对象。
        connection_record:  SQLAlchemy 内部连接记录（未使用，但签名必须保留）。
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")     # WAL 模式：允许读写并发，不互相阻塞
    cursor.execute("PRAGMA busy_timeout=5000")    # 遇到锁时最多等 5 秒再报错
    cursor.execute("PRAGMA synchronous=NORMAL")   # 在安全性和写入速度间取平衡
    cursor.close()
    # SQLite 默认是单线程串行的，加了这三条"开关"之后，
    #         多个请求同时读写数据库时就不容易报"database is locked"错误了。


# ---------------------------------------------------------------------------
# 异步 Session 工厂
# ---------------------------------------------------------------------------
# session 相当于"一次数据库对话"，增删改查都在 session 里完成，
#         用完后提交（commit）或回滚（rollback）。
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,   # commit 后不自动失效已加载的对象属性
    autocommit=False,         # 手动控制事务提交
    autoflush=False,          # 手动控制何时把改动刷到数据库
)

# ORM 模型基类，所有数据库模型都继承自它
Base = declarative_base()


# ---------------------------------------------------------------------------
# FastAPI 依赖注入：获取数据库会话
# ---------------------------------------------------------------------------

async def get_db() -> AsyncSession:
    """FastAPI 依赖项 -- 提供一个带自动提交/回滚的异步数据库会话。

    Yields:
        AsyncSession: 当前请求生命周期内的数据库会话。

    Raises:
        Exception: 业务层抛出的任何异常都会触发回滚后继续向上传播。
    """
    # 每个 API 请求进来时，自动打开一个数据库会话；
    #         请求正常结束就提交，出错就回滚，最后一定会关闭连接。
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

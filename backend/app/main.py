"""
应用入口模块 (main)

@description FastAPI 应用工厂，负责初始化应用实例、注册中间件、挂载路由、
             执行启动时的数据库迁移与种子数据写入。
@author 施乔
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys

from .core.config import settings
from .api import auth, documents, conversations, citations
from .models.models import Base
from .core.database import get_db, engine, async_session
import asyncio


def _get_dist_dir() -> str:
    """获取前端静态文件目录（兼容开发环境和 PyInstaller 打包环境）。"""
    # PyInstaller 打包后，数据文件在 sys._MEIPASS 下
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        candidate = os.path.join(sys._MEIPASS, "dist")
        if os.path.isdir(candidate):
            return candidate
    # 开发环境：backend/dist/
    candidate = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
    if os.path.isdir(candidate):
        return candidate
    return ""

# ---------------------------------------------------------------------------
# 应用工厂
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例。

    Returns:
        FastAPI: 完成中间件注册、路由挂载和启动事件绑定的应用实例。
    """

    app = FastAPI(
        title="RETALK API",
        description="Research Talk - AI 学术研究对话平台 API",
        version="1.0.0"
    )

    # ------------------------------------------------------------------
    # 静态文件目录（前端构建产物）
    # ------------------------------------------------------------------
    dist_dir = _get_dist_dir()
    if dist_dir:
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
        print(f"[INFO] 前端静态文件目录：{dist_dir}")

    # ------------------------------------------------------------------
    # CORS 跨域中间件配置
    # ------------------------------------------------------------------
    # 浏览器有"同源策略"限制，前端和后端端口不同时会被拦截，
    #         这里把前端常用的本地端口都加到白名单，让浏览器放行。
    origins = [f"http://localhost:{port}" for port in range(5170, 5200)] + [
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,          # 允许的前端地址列表
        allow_credentials=True,         # 允许携带 Cookie
        allow_methods=["*"],            # 允许所有 HTTP 方法 (GET/POST/PUT/DELETE...)
        allow_headers=["*"],            # 允许所有请求头
    )

    # ------------------------------------------------------------------
    # 应用启动事件：建表 + 初始化种子数据
    # ------------------------------------------------------------------
    @app.on_event("startup")
    async def on_startup():
        """应用启动时自动执行：创建上传目录、建数据库表、初始化管理员账号。"""

        # 确保文件上传目录存在，不存在则自动创建
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # 用 SQLAlchemy 的 ORM 模型定义，自动在数据库里创建对应的表，
        #         如果表已经存在就跳过，不会重复建。
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # 首次启动时写入一个默认的管理员（root）账号，方便直接登录使用。
        async with async_session() as db:
            from .api.auth import init_root_user
            await init_root_user(db)

        # 启动完成后打印关键配置，便于开发者确认运行环境
        print("[INFO] RETALK Backend 启动完成!")
        print(f"[INFO] 数据库路径：{settings.DATABASE_URL}")
        print(f"[INFO] Ollama 服务：{settings.OLLAMA_BASE_URL}")
        print(f"[INFO] 模型路径：{settings.OLLAMA_MODELS_PATH}")

    # ------------------------------------------------------------------
    # 路由注册：将各业务模块的 Router 挂载到 /api/v1 前缀下
    # ------------------------------------------------------------------
    app.include_router(auth.router, prefix="/api/v1")           # 认证相关 (登录/注册)
    app.include_router(documents.router, prefix="/api/v1")      # 文档管理 (上传/解析)
    app.include_router(conversations.router, prefix="/api/v1")  # 会话管理
    app.include_router(conversations.router_chat, prefix="/api/v1")  # 聊天消息
    app.include_router(citations.router, prefix="/api/v1")      # 引用导出

    # ------------------------------------------------------------------
    # 内置轻量端点
    # ------------------------------------------------------------------

    @app.get("/health")
    async def health_check():
        """健康检查端点，用于运维监控和负载均衡探活。

        Returns:
            dict: 固定返回 {"status": "healthy"}。
        """
        return {"status": "healthy"}

    @app.get("/api/config/ollama")
    async def get_ollama_config():
        """返回当前 Ollama 大模型服务的配置信息，供前端动态读取。

        Returns:
            dict: 包含 base_url、model、models_path 三个字段。
        """
        return {
            "base_url": settings.OLLAMA_BASE_URL,
            "model": settings.OLLAMA_DEFAULT_MODEL,
            "models_path": settings.OLLAMA_MODELS_PATH
        }

    # ------------------------------------------------------------------
    # SPA 回退路由：所有非 API 路径返回 index.html（放在最后注册）
    # ------------------------------------------------------------------
    @app.get("/")
    async def spa_root():
        dist_index = os.path.join(dist_dir, "index.html")
        if os.path.isfile(dist_index):
            return FileResponse(dist_index, media_type="text/html")
        return {"message": "RETALK API"}

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("health"):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        dist_index = os.path.join(dist_dir, "index.html")
        if os.path.isfile(dist_index):
            return FileResponse(dist_index, media_type="text/html")
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    return app


# ---------------------------------------------------------------------------
# 模块级应用实例 -- uvicorn 通过 "app.main:app" 引用此对象
# ---------------------------------------------------------------------------
app = create_app()


# ---------------------------------------------------------------------------
# 开发模式直接运行入口
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )

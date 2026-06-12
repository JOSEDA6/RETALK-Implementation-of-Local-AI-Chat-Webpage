"""认证模块 (auth)
@description 用户注册、登录、登出及身份验证相关 API 接口
@author 施乔
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from ..core.config import settings
from ..core.exceptions import ValidationException
from ..core.database import get_db
from ..models.models import User
from ..schemas.schemas import LoginRequest, RegisterRequest, AuthResponse, UserResponse
from ..auth import verify_jwt_token
import bcrypt
from jose import jwt, JWTError


# 路由初始化
router = APIRouter(prefix="/auth", tags=["Authentication"])


# 内置 root 管理员账号配置（首次启动时自动创建）
ROOT_USERNAME = "root"
ROOT_PASSWORD = "root123456"



# 辅助函数 - 用户初始化 / 密码处理 / Token 生成
async def init_root_user(db: AsyncSession):
    """初始化内置管理员用户

    在应用首次启动时调用，如果数据库中不存在 root 用户则自动创建。

    Args:
        db: 异步数据库会话

    Returns:
        None
    """
    # 去数据库里查一下有没有叫 root 的用户
    result = await db.execute(select(User).where(User.username == ROOT_USERNAME))
    existing_user = result.scalar_one_or_none()

    if not existing_user:
        # 如果数据库里还没有 root 用户，就创建一个默认管理员账号
        root_user = User(
            username=ROOT_USERNAME,
            password_hash=get_password_hash(ROOT_PASSWORD)
        )
        db.add(root_user)
        await db.commit()
        print(f"[INFO] Root 用户已创建：用户名={ROOT_USERNAME}, 密码={ROOT_PASSWORD}")


def get_password_hash(password: str) -> str:
    """对明文密码进行 bcrypt 哈希加密
    Args:password: 用户输入的明文密码
    Returns:经过 bcrypt 加密后的哈希字符串
    """
    # 把用户的密码用 bcrypt 算法"加密"，
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验明文密码与哈希密码是否匹配
    Args:
        plain_password: 用户输入的明文密码
        hashed_password: 数据库中存储的哈希密码
    Returns:匹配返回 True，否则返回 False
    """
    # 把用户输入的密码和数据库里存的加密密码做对比，看看是不是同一个密码
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
    """生成 JWT 访问令牌
    Args:
        user_id: 用户唯一标识
        expires_delta: 令牌有效期时长，为 None 时使用配置中的默认值

    Returns:编码后的 JWT 字符串
    """
    # 计算 token 什么时候过期，然后把用户 ID 和过期时间打包成一个加密字符串（JWT）
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": user_id, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ===========================================================================
# API 端点 - 注册 / 登录 / 登出 / 获取当前用户
# ===========================================================================

@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册接口
    接收用户名和密码，创建新用户并返回 JWT 令牌。

    Args:
        request: 包含 username 和 password 的注册请求体
        db: 异步数据库会话（自动注入）
    Returns:AuthResponse: 包含 user_id、token、expires_at 的认证响应
    """
    # --- 第一步：检查用户名是否已被占用 ---
    # 先去数据库查一下，这个用户名有没有人用过
    result = await db.execute(select(User).where(User.username == request.username))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise ValidationException(detail="用户名已存在")#手动触发异常

    # --- 第二步：创建新用户并写入数据库 ---
    # 用户名没被占用，就把用户名和加密后的密码存到数据库里
    user = User(
        username=request.username.strip(),  # 去除首尾空格
        password_hash=get_password_hash(request.password.strip())  # 去除首尾空格后加密
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # --- 第三步：生成 JWT 令牌并返回 ---
    # 注册成功后，给用户发一个"通行证"（token），后续请求带着它就能证明身份
    token = create_access_token(user.id)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    return AuthResponse(user_id=user.id, token=token, expires_at=expires_at)


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录接口
    验证用户名密码，成功后返回 JWT 令牌。

    Args:
        request: 包含 username、password、remember_me 的登录请求体
        db: 异步数据库会话（自动注入）

    Returns:AuthResponse: 包含 user_id、token、expires_at 的认证响应
    """
    # 根据用户名去数据库里找这个用户
    result = await db.execute(select(User).where(User.username == request.username))
    user = result.scalar_one_or_none()

    # 如果用户不存在，或者密码不对，就返回 401 错误
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # 如果用户勾选了"记住我"，token 有效期就设为 7 天，否则只有 1 天
    expires_delta = timedelta(minutes=10080) if request.remember_me else timedelta(minutes=1440)  # 7 天 或 1 天
    token = create_access_token(user.id, expires_delta)
    expires_at = datetime.now(timezone.utc) + expires_delta

    return AuthResponse(user_id=user.id, token=token, expires_at=expires_at)


@router.post("/logout")
async def logout():
    """用户登出接口
    在无状态 JWT 体系中，登出由客户端删除本地 token 完成，服务端无需额外处理。

    Returns:成功标志 {"success": True}
    """
    # JWT 是无状态的，服务端不保存 token，所以登出只要前端把 token 删掉就行
    return {"success": True}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(verify_jwt_token)
):
    """获取当前登录用户信息

    通过 JWT 令牌识别当前用户，返回用户基本信息。
    Args:current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:UserResponse: 包含 id、username、created_at 的用户信息
    """
    # 根据请求头里的 token 确认是谁在访问，然后把这个用户的信息返回去
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at
    )

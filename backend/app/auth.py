"""
JWT 认证中间件模块 (auth)

@description 提供 verify_jwt_token 依赖函数，从请求头中提取并校验
             JWT Token，解析出当前登录用户对象供路由处理函数使用。
@author 施乔
"""

from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from datetime import datetime

from .core.config import settings
from .core.database import get_db
from .models.models import User


# ---------------------------------------------------------------------------
# FastAPI 依赖项：JWT Token 验证
# ---------------------------------------------------------------------------

async def verify_jwt_token(
    authorization: str = Header(..., description="Bearer token"),
    db: AsyncSession = Depends(get_db)
) -> User:
    """从 Authorization 请求头中提取 JWT Token，验证有效性并返回对应用户。

    前端每次请求接口都会在 Header 里带一个 Token（通行证），

    Args:
        authorization: HTTP Authorization 请求头，格式为 "Bearer <token>"。
        db:            异步数据库会话（由 FastAPI 依赖注入自动提供）。

    Returns:
        User: 通过验证的用户 ORM 对象。

    Raises:
        HTTPException(401): Token 缺失、格式错误、过期、或对应用户不存在时抛出。
    """

    # ---- 第一步：检查 Authorization 请求头是否存在 ----
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )

    # ---- 第二步：从 "Bearer <token>" 中拆分出纯 Token 字符串 ----
    scheme, _, token = authorization.partition(" ")
    # partition(" ") 把字符串按第一个空格一分为二，
    #         前面是 "Bearer"，后面是真正的 Token。
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme"
        )

    # ---- 第三步：解码 JWT 并提取用户 ID ----
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        # jwt.decode 会验证签名和过期时间，
        #         通过后返回里面存的数据（payload），"sub" 字段就是用户 ID。
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except JWTError:
        # Token 签名不对或已过期都会走到这里
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # ---- 第四步：用解析出的 user_id 去数据库查用户是否真实存在 ----
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    # 就算 Token 是真的，也要确认这个用户没被删除，
    #         scalar_one_or_none 要么返回用户对象，要么返回 None。
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user

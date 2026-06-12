"""
全局配置模块 (config)

@description 使用 pydantic-settings 集中管理应用所有可配置项，
             支持通过 .env 文件或环境变量进行覆盖。
@author 施乔
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用全局配置类。

    所有字段均可通过同名环境变量或 .env 文件覆盖默认值。
    这个类就是整个后端的"设置中心"，所有需要改的参数都写在这里，
           改 .env 文件就能生效，不用改代码。
    """

    # ------------------------------------------------------------------
    # Ollama 大模型服务配置
    # ------------------------------------------------------------------
    OLLAMA_BASE_URL: str = "http://localhost:11434"       # Ollama HTTP API 地址
    OLLAMA_DEFAULT_MODEL: str = "llama3.2:latest"         # 默认使用的模型名称
    OLLAMA_MODELS_PATH: str = "D:\\Ollama\\models"        # 模型文件在本机的存储路径

    # ------------------------------------------------------------------
    # JWT 身份认证配置
    # ------------------------------------------------------------------
    JWT_SECRET_KEY: str = "retalk-demo-secret-key-2026"   # 签名密钥（演示用固定值）
    JWT_ALGORITHM: str = "HS256"                          # 签名算法
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080          # Token 有效期，默认 7 天
    # JWT 就是后端发给前端的"通行证"，带着它请求接口后端才认你是谁。

    # ------------------------------------------------------------------
    # 数据库配置
    # ------------------------------------------------------------------
    DATABASE_URL: str = "sqlite+aiosqlite:///./retalk.db"
    # 用 SQLite 文件数据库，数据就存在项目根目录的 retalk.db 文件里，
    #         aiosqlite 是异步驱动，能配合 FastAPI 的 async 用法。

    # ------------------------------------------------------------------
    # 文件上传配置
    # ------------------------------------------------------------------
    UPLOAD_DIR: str = "./uploads"       # 上传文件保存目录
    MAX_FILE_SIZE_MB: int = 10          # 单个文件大小上限（MB）

    class Config:
        env_file = ".env"               # 自动读取项目根目录下的 .env 文件


# ---------------------------------------------------------------------------
# 全局单例：整个应用通过 `from .core.config import settings` 使用同一份配置
# ---------------------------------------------------------------------------
settings = Settings()

"""
Pydantic 数据模式模块 (schemas)

@description 定义所有 API 请求体与响应体的数据结构（DTO），
             用于自动参数校验、序列化以及 OpenAPI 文档生成。
@author 施乔
"""

# 这个文件里的类都是"数据格式模板"。前端发来的 JSON 必须符合这些模板，
#         后端返回的 JSON 也会按这些模板自动生成，格式不对就报错。

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List


# =========================================================================
# 用户相关 Schemas
# =========================================================================

class UserResponse(BaseModel):
    """用户信息响应体。"""
    id: str
    username: str
    created_at: Optional[datetime] = None


# =========================================================================
# 认证相关 Schemas
# =========================================================================

class LoginRequest(BaseModel):
    """登录请求体。

    Attributes:
        username: 用户名，3-20 个字符。
        password: 密码，6-20 个字符。
        remember_me: 是否"记住我"（影响 Token 有效期）。
    """
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=6, max_length=20)
    remember_me: bool = False


class RegisterRequest(BaseModel):
    """注册请求体。

    Attributes:
        username: 用户名，3-20 个字符。
        password: 密码，6-20 个字符。
    """
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=6, max_length=20)


class AuthResponse(BaseModel):
    """认证成功响应体，包含 Token 及过期时间。"""
    user_id: str
    token: str
    expires_at: datetime


# =========================================================================
# 文档相关 Schemas
# =========================================================================

class DocumentCreate(BaseModel):
    """文档创建请求体（内部使用，由上传接口组装）。"""
    title: str
    file_path: str
    file_type: str
    file_size: int
    status: str = "uploaded"


class DocumentResponse(BaseModel):
    """文档信息响应体。"""
    id: str
    title: str
    file_path: str
    file_type: str
    file_size: int
    upload_time: datetime
    status: str
    chunk_count: Optional[int] = None    # 文档被拆分后的分块数量


# =========================================================================
# 引用相关 Schemas
# =========================================================================

class CitationBase(BaseModel):
    """引用基础字段。"""
    document_title: str                  # 来源文档标题
    page: Optional[int] = None           # 所在页码（PDF 适用）
    content: str                         # 引用的原文片段


class CitationResponse(CitationBase):
    """引用完整响应体，包含关联 ID。"""
    id: str
    document_id: str
    chunk_id: str


# =========================================================================
# 消息相关 Schemas
# =========================================================================

class MessageBase(BaseModel):
    """消息基础字段。"""
    content: str


class MessageCreate(MessageBase):
    """新建消息请求体。"""
    conversation_id: Optional[str] = None    # 为空时后端自动创建新会话
    role: str = "user"                       # 角色：user / assistant


class MessageResponse(MessageBase):
    """消息完整响应体。"""
    id: str
    conversation_id: str
    role: str
    citations: Optional[List[CitationResponse]] = None   # AI 回复可能附带的引用列表
    created_at: datetime


# =========================================================================
# 会话相关 Schemas
# =========================================================================

class ConversationBase(BaseModel):
    """会话基础字段。"""
    title: str = "New Conversation"
    model_type: str = "ollama"               # 使用的模型类型


class ConversationCreate(ConversationBase):
    """创建会话请求体（继承基础字段即可）。"""
    pass


class ConversationResponse(ConversationBase):
    """会话列表项响应体。"""
    id: str
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationResponse):
    """会话详情响应体，包含完整消息列表。"""
    messages: List[MessageResponse] = []


# =========================================================================
# 聊天相关 Schemas
# =========================================================================

class ChatRequest(BaseModel):
    """聊天请求体。

    Attributes:
        conversation_id: 会话 ID，为空时自动创建新会话。
        message: 用户发送的消息文本。
        model_type: 使用的模型类型，默认 ollama。
    """
    conversation_id: Optional[str] = None
    message: str
    model_type: str = "ollama"


class ChatResponse(BaseModel):
    """聊天响应体。

    Attributes:
        answer: AI 生成的回复文本。
        citations: 回复中引用的文献片段列表。
        conversation_id: 所属会话 ID。
    """
    answer: str
    citations: List[CitationResponse]
    conversation_id: Optional[str] = None


# =========================================================================
# 导出相关 Schemas
# =========================================================================

class ExportRequest(BaseModel):
    """引用导出请求体。

    Attributes:
        message_id: 要导出引用的消息 ID。
        format: 导出格式，支持 "bibtex" 或 "gb7714"。
    """
    message_id: str
    format: str  # "bibtex" or "gb7714"

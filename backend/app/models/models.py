"""
ORM 数据模型模块 (models)

@description 使用 SQLAlchemy 定义所有数据库表结构及表间关系，
             包括用户、文档、文档分块、会话、消息五张核心表。
@author 施乔
"""

# 这个文件定义了数据库里有哪些"表"、每张表有哪些"列"，
# 以及表和表之间的关联关系（比如一个用户拥有多个文档）。

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone
import uuid
import enum

# ORM 模型基类，所有表模型都继承自 Base
Base = declarative_base()


# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------

def generate_uuid():
    """生成一个随机的 UUID v4 字符串，作为各表主键的默认值。

    Returns:
        str: 形如 "550e8400-e29b-41d4-a716-446655440000" 的唯一标识。
    """
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# 枚举类型
# ---------------------------------------------------------------------------

class DocumentStatus(enum.Enum):
    """文档处理状态枚举。

    - UPLOADED: 刚上传，尚未解析。
    - PARSED:   解析（分块）完成，可用于检索。
    - FAILED:   解析失败。
    """
    UPLOADED = "uploaded"
    PARSED = "parsed"
    FAILED = "failed"


# =========================================================================
# 用户表 (users)
# =========================================================================

class User(Base):
    """用户模型 -- 存储注册用户的基本信息。"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(20), unique=True, nullable=False, index=True)  # 用户名，唯一且建索引加速查询
    password_hash = Column(String(255), nullable=False)                     # bcrypt 哈希后的密码
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # relationship 定义"一对多"关系 -- 一个用户拥有多个会话和多个文档。
    #         cascade="all, delete-orphan" 表示删用户时自动删掉他的会话和文档。
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")


# =========================================================================
# 文档表 (documents)
# =========================================================================

class Document(Base):
    """文档模型 -- 存储用户上传的学术文档元信息。"""
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # 所属用户外键
    title = Column(String(500), nullable=False)         # 文档标题 / 文件名
    file_path = Column(String(500), nullable=False)     # 服务端存储路径
    file_type = Column(String(20), nullable=False)      # 文件类型 (pdf / docx / txt ...)
    file_size = Column(Integer, nullable=False)          # 文件大小（字节）
    upload_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED)

    user = relationship("User", back_populates="documents")
    # 一个文档解析后会被拆成多个"块"（chunks），方便后续做检索。
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


# =========================================================================
# 文档分块表 (chunks)
# =========================================================================

class Chunk(Base):
    """文档分块模型 -- 文档被解析后按段落/页面拆分的文本片段。

    一篇长论文不能整篇喂给大模型，所以先切成小块，
           检索时只取最相关的几块拼给 AI，这就是 RAG 的核心思路。
    """
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)  # 所属文档外键
    content = Column(Text, nullable=False)        # 分块的文本内容
    chunk_index = Column(Integer, nullable=False)  # 在文档中的顺序编号（从 0 开始）
    page_info = Column(JSON)                       # 页码等元信息（JSON 格式，可为空）
    embedding = Column(Text, nullable=True)        # embedding 向量（JSON 格式）

    document = relationship("Document", back_populates="chunks")


# =========================================================================
# 会话表 (conversations)
# =========================================================================

class Conversation(Base):
    """会话模型 -- 用户与 AI 的一次对话会话。"""
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    # onupdate 表示每次更新这条记录时自动刷新 updated_at 时间戳。
    model_type = Column(String(50), default="ollama")   # 该会话使用的模型类型

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


# =========================================================================
# 消息表 (messages)
# =========================================================================

class Message(Base):
    """消息模型 -- 会话中的单条消息（用户提问或 AI 回复）。"""
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)     # 消息角色："user" 或 "assistant"
    content = Column(Text, nullable=False)         # 消息正文
    citations = Column(JSON, default=list)         # AI 回复附带的引用列表（JSON 数组）
    # citations 存的是 AI 回答时引用了哪些文档片段，前端据此展示引用来源。
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")

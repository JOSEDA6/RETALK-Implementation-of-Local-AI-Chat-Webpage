"""文档管理模块 (documents)
@description 文档的上传、解析、列表查询和删除功能
@author 施乔
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import uuid
from datetime import datetime
from ..core.config import settings
from ..core.database import get_db
from ..core.exceptions import FileTooLargeException, ValidationException
from ..models.models import Document, DocumentStatus, Chunk, User
from ..schemas.schemas import DocumentResponse
from ..services.pdf_parser import parse_document
from ..services.embedding_service import get_embedding, serialize_embedding
from ..auth import verify_jwt_token

# ---------------------------------------------------------------------------
# 路由初始化
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/documents", tags=["Documents"])

# ---------------------------------------------------------------------------
# 文件上传约束常量
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = {".pdf", ".docx"}  # 允许上传的文件类型
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # 将 MB 转换为字节


# ===========================================================================
# 辅助函数
# ===========================================================================

def get_file_extension(filename: str) -> str:
    """提取文件扩展名并转为小写

    Args:filename: 文件名字符串

    Returns:小写的扩展名（含点号），例如 ".pdf"
    """
    return os.path.splitext(filename)[1].lower()


# ===========================================================================
# API 端点 - 文档上传 / 列表 / 删除
# ===========================================================================

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """上传并解析文档

    接收用户上传的文件，验证类型和大小后保存到磁盘，
    创建数据库记录，然后同步触发文档解析（拆分为 chunk）。

    Args:
        file: 用户上传的文件对象
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        DocumentResponse: 文档信息（含解析状态）
    """
    # --- 第一步：校验文件类型 ---
    # 看看上传的文件后缀是不是 .pdf 或 .docx，不是的话就拒绝
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationException(detail=f"File type {ext} not allowed. Allowed types: PDF, DOCX")

    # --- 第二步：读取文件内容并校验大小 ---
    # 把上传的文件内容全部读进内存，然后检查文件大小有没有超过限制
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise FileTooLargeException(detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    # --- 第三步：生成唯一文件名并保存到磁盘 ---
    # 用 UUID 生成一个不会重复的文件名，避免不同用户上传同名文件互相覆盖
    unique_filename = f"{uuid.uuid4()}{ext}"
    upload_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # 如果上传目录不存在就自动创建
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(upload_path, "wb") as f:
        f.write(content)

    # --- 第四步：在数据库中创建文档记录 ---
    # 把文档的基本信息（标题、路径、大小等）存到数据库里
    document = Document(
        title=file.filename or unique_filename,
        file_path=upload_path,
        file_type=ext[1:].upper(),  # 去掉点号并转大写，如 ".pdf" -> "PDF"
        file_size=file_size,
        status=DocumentStatus.UPLOADED,
        user_id=current_user.id
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # --- 第五步：触发文档解析，将文档内容拆分为 chunk ---
    try:
        # 调用解析服务把文档内容按段落/页面拆分成小块（chunk），方便后续检索
        chunks = parse_document(upload_path, ext[1:])

        # 为每个 chunk 生成 embedding 并存入数据库
        for chunk_data in chunks:
            try:
                embedding_vec = get_embedding(chunk_data["content"])
                embedding_json = serialize_embedding(embedding_vec)
            except Exception:
                embedding_json = None  # embedding 失败不影响文档解析

            chunk = Chunk(
                document_id=document.id,
                content=chunk_data["content"],
                chunk_index=chunk_data["chunk_index"],
                page_info=chunk_data["page_info"],
                embedding=embedding_json
            )
            db.add(chunk)

        # 解析成功，把文档状态更新为"已解析"
        document.status = DocumentStatus.PARSED
        await db.commit()
    except Exception as e:
        # 解析失败也不影响文件上传，只是把状态标记为"失败"，方便后续排查
        document.status = DocumentStatus.FAILED
        await db.commit()
        import logging
        logging.error(f"Failed to parse document {document.id}: {e}")

    return DocumentResponse(
        id=document.id,
        title=document.title,
        file_path=document.file_path,
        file_type=document.file_type,
        file_size=document.file_size,
        upload_time=document.upload_time,
        status=document.status.value
    )


@router.post("/{document_id}/reparse", response_model=DocumentResponse)
async def reparse_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """重新解析文档：删除旧 chunk 后重新分块并生成 embedding。

    上传后如果分块算法有更新，可以调用此接口在不重新上传的前提下
    用最新逻辑重新切分已有文档。

    Args:
        document_id: 文档唯一标识
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        DocumentResponse: 更新后的文档信息（含新状态）
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # 删除旧的 chunk（级联删除 embedding）
    old_chunks = await db.execute(select(Chunk).where(Chunk.document_id == document_id))
    for chunk in old_chunks.scalars().all():
        await db.delete(chunk)
    await db.flush()

    # 用最新分块算法重新解析
    ext = f".{document.file_type.lower()}"
    try:
        chunks = parse_document(document.file_path, ext[1:])
        for chunk_data in chunks:
            try:
                embedding_vec = get_embedding(chunk_data["content"])
                embedding_json = serialize_embedding(embedding_vec)
            except Exception:
                embedding_json = None
            chunk = Chunk(
                document_id=document.id,
                content=chunk_data["content"],
                chunk_index=chunk_data["chunk_index"],
                page_info=chunk_data["page_info"],
                embedding=embedding_json,
            )
            db.add(chunk)

        document.status = DocumentStatus.PARSED
        await db.commit()
    except Exception as e:
        document.status = DocumentStatus.FAILED
        await db.commit()
        import logging
        logging.error(f"Failed to reparse document {document.id}: {e}")

    await db.refresh(document)
    return DocumentResponse(
        id=document.id,
        title=document.title,
        file_path=document.file_path,
        file_type=document.file_type,
        file_size=document.file_size,
        upload_time=document.upload_time,
        status=document.status.value,
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """获取当前用户的文档列表

    按上传时间倒序返回当前用户的所有文档，包含各文档的 chunk 数量。

    Args:
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        List[DocumentResponse]: 文档列表
    """
    from sqlalchemy.orm import joinedload

    # 查出当前用户的所有文档，同时预加载每个文档的 chunk 数据（避免 N+1 查询问题）
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .options(joinedload(Document.chunks))
        .order_by(Document.upload_time.desc())
    )
    # 因为用了 joinedload，同一个文档可能出现多次，用 unique() 去重
    documents = result.scalars().unique().all()

    return [
        DocumentResponse(
            id=doc.id,
            title=doc.title,
            file_path=doc.file_path,
            file_type=doc.file_type,
            file_size=doc.file_size,
            upload_time=doc.upload_time,
            status=doc.status.value,
            chunk_count=len(doc.chunks) if doc.status == DocumentStatus.PARSED else None
        )
        for doc in documents
    ]


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """删除指定文档
    验证文档存在且属于当前用户后，从磁盘和数据库中同时删除该文档。

    Args:
        document_id: 文档唯一标识
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        成功标志 {"success": True}
    """
    # 根据文档 ID 去数据库里查这个文档
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # 确认这个文档是当前用户上传的，不是的话就拒绝删除
    if document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this document")

    # 先把磁盘上的实际文件删掉
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    # 再从数据库里删掉这条文档记录（关联的 chunk 会级联删除）
    await db.delete(document)
    await db.commit()

    return {"success": True}

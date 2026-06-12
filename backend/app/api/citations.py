"""引用管理模块 (citations)
@description 文献引用的导出功能，支持按消息或引用 ID 批量导出
@author 施乔
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from ..core.database import get_db
from ..models.models import Message
from ..schemas.schemas import CitationResponse
from ..services.export_service import export_citations

# ---------------------------------------------------------------------------
# 路由初始化
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/citations", tags=["Citations"])


# ===========================================================================
# API 端点 - 引用导出
# ===========================================================================
@router.get("/export")
async def export_citations_endpoint(
    message_id: Optional[str] = None,
    citation_ids: Optional[str] = None,
    format: str = "bibtex",
    db: AsyncSession = Depends(get_db)
):
    """导出引用为指定格式

    支持通过 message_id 获取某条消息的全部引用并导出，
    或通过 citation_ids（逗号分隔）批量导出指定引用。

    Args:
        message_id: 消息 ID，用于获取该消息关联的全部引用
        citation_ids: 逗号分隔的引用 ID 列表（当前为预留参数，暂未实现）
        format: 导出格式，默认为 "bibtex"
        db: 异步数据库会话（自动注入）

    Returns:
        导出后的引用内容字符串（格式由 format 参数决定）
    """
    citations = []

    # --- 分支一：按消息 ID 查询引用 ---
    if message_id:
        # 根据消息 ID 去数据库查这条消息，拿出它附带的引用列表
        result = await db.execute(
            select(Message).where(Message.id == message_id)
        )
        message = result.scalar_one_or_none()

        if not message or not message.citations:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No citations found")
        citations = message.citations

    # --- 分支二：按引用 ID 列表查询（暂未实现） ---
    elif citation_ids:
        # 这个功能还没做完，目前支持通过 message_id 来导出引用
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use message_id parameter")

    # --- 分支三：两个参数都没传，报错 ---
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing message_id or citation_ids")

    # --- 调用导出服务，将引用转换为目标格式 ---
    try:
        # 把引用数据交给导出服务，按指定格式（如 bibtex）生成最终内容
        content = export_citations(citations, format)
        return content
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

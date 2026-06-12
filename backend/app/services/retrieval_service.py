"""
Retrieval Service -- 文档片段检索服务
@description 根据用户查询，通过 embedding 向量相似度从数据库中检索最相关的文档片段。
"""

from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.models import Chunk
from .embedding_service import get_embedding, cosine_similarity, deserialize_embedding


async def search_chunks(
    query: str,
    db: AsyncSession,
    top_k: int = 5,
    min_score: float = 0.38,
) -> List[Dict[str, Any]]:
    """检索与用户查询最相关的文档片段。

    使用 Ollama 将查询转为向量，然后与所有 chunk 的 embedding 计算余弦相似度，
    返回最相似的 top_k 个片段。

    Args:
        query:    用户的查询文本
        db:       异步数据库会话
        top_k:    返回的最大片段数量，默认 5
        min_score: 最低相似度阈值，低于此值的片段会被过滤掉

    Returns:
        按相似度降序排列的片段信息列表
    """
    # 查询所有有 embedding 的 chunk
    result = await db.execute(select(Chunk).where(Chunk.embedding.isnot(None)))
    all_chunks = result.scalars().all()

    if not all_chunks:
        # 没有 embedding 数据时回退到返回前 top_k 条
        fallback = await db.execute(select(Chunk).limit(top_k))
        return [
            {"id": c.id, "document_id": c.document_id, "content": c.content,
             "page_info": c.page_info, "chunk_index": c.chunk_index, "score": 0.0}
            for c in fallback.scalars().all()
        ]

    # 为查询生成 embedding
    try:
        query_emb = get_embedding(query)
    except Exception:
        # embedding 失败时回退
        fallback = await db.execute(select(Chunk).limit(top_k))
        return [
            {"id": c.id, "document_id": c.document_id, "content": c.content,
             "page_info": c.page_info, "chunk_index": c.chunk_index, "score": 0.0}
            for c in fallback.scalars().all()
        ]

    # 计算每个 chunk 与查询的相似度
    scored = []
    for chunk in all_chunks:
        chunk_emb = deserialize_embedding(chunk.embedding)
        score = cosine_similarity(query_emb, chunk_emb)
        if score >= min_score:
            scored.append({
                "id": chunk.id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "page_info": chunk.page_info,
                "chunk_index": chunk.chunk_index,
                "score": round(score, 4),
            })

    # 按相似度降序排列，取 top_k
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]

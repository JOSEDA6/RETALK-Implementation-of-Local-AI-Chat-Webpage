"""
Generation Service -- RAG 回答生成服务
@description 基于 Ollama 大模型的 RAG (Retrieval-Augmented Generation) 回答生成模块。
             检索文档片段 → 构建 prompt → 调用模型 → 提取引用。
@author 施乔
"""
import re
from typing import List, Dict, Any, Tuple

import ollama
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .retrieval_service import search_chunks


# ---------------------------------------------------------------------------
# 全局常量 -- System Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """你是学术助手。严格基于参考资料回答问题。每句话末尾用 [X] 标注来源。
参考资料中未提及的内容，直接说"参考资料中未提及"，不要自行编造。"""


# ---------------------------------------------------------------------------
# 同步 Ollama 调用
# ---------------------------------------------------------------------------

def call_ollama_simple(prompt: str, model: str = None) -> str:
    """同步调用 Ollama 大模型生成回答（非流式）。

    Args:
        prompt: 用户输入的完整提示词（已包含上下文和问题）
        model:  Ollama 模型名称，默认 "llama3.2:latest"

    Returns:
        模型生成的回答文本；调用失败时返回错误提示字符串
    """
    model = model or "llama3.2:latest"
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user', 'content': prompt}
    ]
    try:
        response = ollama.chat(model=model, messages=messages, options={"temperature": 0.1})
        return response['message']['content']
    except Exception as e:
        return f"模型调用失败：{str(e)}\n请检查 Ollama 服务是否启动（默认端口 11434）"


# ---------------------------------------------------------------------------
# 引用去重
# ---------------------------------------------------------------------------

def _deduplicate_citations(
    response_text: str,
    chunk_dicts: List[Dict],
    documents: Dict[str, str],
) -> List[Dict[str, Any]]:
    """从注入标记后的回答中提取实际出现的引用，去重后返回引用列表。

    Args:
        response_text: 已注入 [X] 标记的回答文本
        chunk_dicts:   检索到的 chunk 列表
        documents:     {document_id: title} 映射

    Returns:
        去重后的引用信息列表
    """
    # 从文本中提取所有出现过的引用编号
    cited_numbers = set(int(m.group(1)) for m in re.finditer(r'\[(\d+)\]', response_text))

    seen = set()
    citations = []
    for i, chunk in enumerate(chunk_dicts):
        num = i + 1
        if num not in cited_numbers:
            continue
        cid = chunk["id"]
        if cid in seen:
            continue
        seen.add(cid)
        doc_title = documents.get(chunk["document_id"], "未知文档")
        citations.append({
            "id": cid,
            "document_id": chunk["document_id"],
            "document_title": doc_title,
            "page": chunk["page_info"].get("page") if chunk["page_info"] else None,
            "content": chunk["content"],
            "chunk_id": cid,
            "score": chunk.get("score", 0),
        })
    return citations


# ---------------------------------------------------------------------------
# RAG 主流程
# ---------------------------------------------------------------------------

async def generate_answer_with_citations(
    message: str,
    db: AsyncSession,
) -> Tuple[str, List[Dict[str, Any]]]:
    """RAG 主流程：检索 → 生成 → 提取引用。

    模型按 prompt 要求自行标注 [X] 引用，后处理做格式统一（(Source X) → [X]），
    最后从文本中提取引用编号并映射到 chunk 数据。

    Args:
        message: 用户问题
        db:      异步数据库会话

    Returns:
        (response_text, citations)
    """
    chunk_dicts = await search_chunks(query=message, db=db, top_k=3)

    if not chunk_dicts:
        response = call_ollama_simple(f"请回答这个问题：{message}")
        return response, []

    # 批量查询文档标题
    from ..models.models import Document
    document_ids = list(set(c["document_id"] for c in chunk_dicts))
    doc_result = await db.execute(
        select(Document).where(Document.id.in_(document_ids))
    )
    documents = {doc.id: doc.title for doc in doc_result.scalars().all()}

    context_parts = [f"[{i+1}] {c['content']}" for i, c in enumerate(chunk_dicts)]
    context = "\n\n".join(context_parts)

    prompt = f"""参考资料：

{context}

问题：{message}

回答（每句话末尾用 [1] [2] 等编号标注来源）："""

    response_text = call_ollama_simple(prompt)

    # 兜底：模型有时输出 (Source X)，替换为 [X]
    response_text = re.sub(r'\(Source\s*(\d+)\)', r'[\1]', response_text)
    # 模型可能字面输出 [X] 占位符，去掉
    response_text = re.sub(r'\[[xX]\]', '', response_text)

    citations = _deduplicate_citations(response_text, chunk_dicts, documents)
    return response_text, citations

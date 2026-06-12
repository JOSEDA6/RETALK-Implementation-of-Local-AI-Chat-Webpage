"""
PDF/DOCX Parser Service -- 文档解析与分块服务
@description 负责解析 PDF 和 DOCX 格式的文档，提取文本内容，并使用递归分块算法
             将长文本切分为约 500 tokens 的小块，供后续检索和 RAG 流程使用。
             分块策略采用多级切分：优先按段落拆分，段落仍过长时按句子拆分。
@author 施乔
"""
import os
from typing import List, Dict, Any
from pypdf import PdfReader
from docx import Document


# ---------------------------------------------------------------------------
# PDF 文本提取
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """从 PDF 文件逐页提取文本内容。

    使用 pypdf 库读取 PDF，遍历每一页并提取文本。
    跳过空白页（提取结果为空的页面）。

    Args:
        file_path: PDF 文件的绝对路径

    Returns:页面列表，每项包含 page_number（从 1 开始）和 content页面文本
    """
    reader = PdfReader(file_path)
    pages = []

    # 一页一页地读 PDF，把每页的文字提取出来，空白页跳过
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({
                "page_number": i + 1,
                "content": text,
            })

    return pages


# ---------------------------------------------------------------------------
# DOCX 文本提取
# ---------------------------------------------------------------------------

def extract_text_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """从 DOCX 文件提取全部段落文本。
    DOCX 格式没有物理分页概念，因此将所有段落合并为单个"页面"返回。

    Args:file_path: DOCX 文件的绝对路径

    Returns:包含单个元素的列表，page_number 固定为 1，content 为全部段落拼接文本
    """
    doc = Document(file_path)
    content = []
    current_text = []

    # 把 Word 文档里所有非空段落的文字收集起来，拼成一整段
    for para in doc.paragraphs:
        if para.text.strip():
            current_text.append(para.text)

    return [{
        "page_number": 1,  # DOCX 没有分页概念，统一标记为第 1 页
        "content": "\n\n".join(current_text)
    }]


# ---------------------------------------------------------------------------
# 递归分块算法
# ---------------------------------------------------------------------------

def _estimate_tokens(text: str) -> int:
    """估算文本的 token 数量（中文自适应）。

    中文字符约 1.5 字符/token，英文约 4 字符/token。
    按文本实际内容的中英文比例加权计算，避免中文文档分块过少。

    Args:
        text: 输入文本

    Returns:
        估算的 token 数（至少为 1，避免除零）
    """
    total = len(text)
    if total == 0:
        return 1

    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    chinese_ratio = chinese_chars / total

    # 纯中文 ~1.5 字符/token，纯英文 ~4 字符/token，加权混合
    ratio = 4 * (1 - chinese_ratio) + 1.5 * chinese_ratio
    return max(int(total / ratio), 1)


def recursive_chunk(text: str, max_tokens: int = 500) -> List[str]:
    """递归分块：将长文本切分为不超过 max_tokens 的小块。

    采用多级切分策略：
    1. 估算文本 token 数，若不超过上限则直接返回
    2. 优先按双换行符（段落）拆分，将段落累积到不超限的块中
    3. 若文本只有一个段落且仍过长，退化为按句子拆分
    token 估算使用 _estimate_tokens，自动适配中文/英文混合文本。

    Args:
        text:       待分块的原始文本
        max_tokens: 每块的最大 token 数，默认 500

    Returns:
        分块后的文本列表；输入为空时返回空列表
    """
    tokens = _estimate_tokens(text)

    if tokens <= max_tokens:
        return [text] if text.strip() else []

    # ------ 第一级切分：按段落（双换行符）拆分 ------
    paragraphs = text.split("\n\n")
    if len(paragraphs) > 1:
        chunks = []
        current_chunk = []
        current_tokens = 0

        for para in paragraphs:
            para_tokens = _estimate_tokens(para)
            if current_tokens + para_tokens > max_tokens:
                if current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                current_chunk = [para]
                current_tokens = para_tokens
            else:
                current_chunk.append(para)
                current_tokens += para_tokens

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks if chunks else [text]

    # ------ 第二级切分：按句子拆分 ------
    sentences = text.replace("\u3002", "|").replace(".", "|").replace("!", "|").replace("?", "|").split("|")
    chunks = []
    current_chunk = []
    current_tokens = 0

    for sentence in sentences:
        if not sentence.strip():
            continue
        sentence_tokens = _estimate_tokens(sentence)
        if current_tokens + sentence_tokens > max_tokens:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_tokens = sentence_tokens
        else:
            current_chunk.append(sentence)
            current_tokens += sentence_tokens

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks if chunks else [text]


# ---------------------------------------------------------------------------
# 文档解析主入口
# ---------------------------------------------------------------------------

def parse_document(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    """解析文档并执行分块，返回结构化的片段列表。

    根据文件类型调用对应的提取函数，然后对每页文本执行递归分块，
    为每个块分配全局递增的索引编号。

    Args:
        file_path: 文档文件的绝对路径
        file_type: 文件类型标识，"pdf" 或 "docx"（不区分大小写）

    Returns:
        片段列表，每项包含 chunk_index（全局索引）、content（文本）、
        page_info（所属页码信息）

    Raises:
        ValueError: 不支持的文件类型
    """
    # 根据文件后缀选择对应的解析方法
    if file_type.lower() == "pdf":
        pages = extract_text_from_pdf(file_path)
    elif file_type.lower() == "docx":
        pages = extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    # 对每页文本执行递归分块，并分配全局索引
    # 把每一页的文字切成小块，给每块编个号（从 0 开始递增），
    #         同时记录这块来自哪一页
    chunks = []
    chunk_index = 0

    for page in pages:
        page_chunks = recursive_chunk(page["content"])
        for chunk_content in page_chunks:
            chunks.append({
                "chunk_index": chunk_index,
                "content": chunk_content,
                "page_info": {"page": page["page_number"]},
            })
            chunk_index += 1

    return chunks

"""Embedding Service -- 文本向量化与相似度计算
@description 使用 Ollama 将文本转为向量（embedding），并提供余弦相似度计算。
"""

import json
import ollama
from typing import List

EMBEDDING_MODEL = "llama3.2"
EMBEDDING_DIM = 3072#32*96


def get_embedding(text: str) -> List[float]:
    """将文本转为 embedding 向量。

    Args:
        text: 要向量化的文本

    Returns:
        float 列表，维度为 EMBEDDING_DIM
    """
    response = ollama.embeddings(model=EMBEDDING_MODEL, prompt=text)
    return response["embedding"]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """计算两个向量之间的余弦相似度（值越接近 1 表示越相似）。

    Args:
        a, b: 两个等长的 float 向量

    Returns:
        [-1, 1] 范围内的相似度分值
    """
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def serialize_embedding(embedding: List[float]) -> str:
    """将 embedding 向量序列化为 JSON 字符串（存数据库用）。"""
    return json.dumps(embedding)


def deserialize_embedding(data: str) -> List[float]:
    """从 JSON 字符串反序列化出 embedding 向量。"""
    return json.loads(data)

"""测试修复后的 RAG 全流程"""
import sys, os, asyncio, logging
sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(level=logging.INFO)
from app.services.retrieval_service import search_chunks
from app.services.generation_service import generate_answer_with_citations, call_ollama_simple
from app.core.database import async_session


async def test_retrieval():
    print("=" * 50)
    print("测试 1: 检索服务")
    print("=" * 50)
    async with async_session() as session:
        results = await search_chunks(
            query="基于多模型集成的轻量化 AI 对话系统设计与实现",
            db=session,
            top_k=3
        )
        print(f"检索到 {len(results)} 个相关片段:")
        for r in results:
            print(f"  相似度: {r['score']}")
            print(f"  内容: {r['content'][:100]}...")
            print()

        if not results:
            print("警告: 没有检索到任何结果！")
            # Debug: check if chunks have embeddings
            from sqlalchemy import select
            from app.models.models import Chunk
            result = await session.execute(select(Chunk).limit(3))
            for c in result.scalars().all():
                print(f"  Chunk {c.id[:8]}: embedding={'有' if c.embedding else '无'}, content={c.content[:50]}")


async def test_generation():
    print("=" * 50)
    print("测试 2: 直接调用 Ollama")
    print("=" * 50)
    result = call_ollama_simple("请用中文回答：基于多模型集成的轻量化 AI 对话系统，这篇论文涉及什么内容？")
    print(f"回答: {result[:200]}")
    print()

    print("=" * 50)
    print("测试 3: 完整 RAG 流程")
    print("=" * 50)
    async with async_session() as session:
        answer, citations = await generate_answer_with_citations(
            message="基于多模型集成的轻量化 AI 对话系统设计与实现，这篇论文的主要内容是什么？",
            db=session
        )
        print(f"回答: {answer[:300]}")
        print(f"引用数: {len(citations)}")
        for c in citations:
            print(f"  文档: {c.get('document_title', '?')}")


if __name__ == "__main__":
    asyncio.run(test_retrieval())
    print()
    asyncio.run(test_generation())

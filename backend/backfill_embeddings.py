"""为数据库中已有的 chunk 生成 embedding（补全历史数据）"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.embedding_service import get_embedding, serialize_embedding
from app.models.models import Chunk
from app.core.database import engine, async_session
from sqlalchemy import select
import asyncio


async def backfill():
    async with async_session() as session:
        result = await session.execute(select(Chunk).where(Chunk.embedding.is_(None)))
        chunks = result.scalars().all()
        total = len(chunks)
        if total == 0:
            print("所有 chunk 已有 embedding，无需处理")
            return

        print(f"需要生成 embedding 的 chunk 数：{total}")
        for i, chunk in enumerate(chunks):
            try:
                emb = get_embedding(chunk.content)
                chunk.embedding = serialize_embedding(emb)
                if (i + 1) % 5 == 0:
                    await session.commit()
                    print(f"  [{i+1}/{total}] 已提交")
            except Exception as e:
                print(f"  [{i+1}/{total}] 失败 (id={chunk.id}): {e}")

        await session.commit()
        print(f"完成！共处理 {total} 个 chunk")


if __name__ == "__main__":
    asyncio.run(backfill())

"""对话管理模块 (conversations)
@description 对话的创建、查询、删除，以及聊天补全（非流式）端点
@author 施乔
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from datetime import datetime, timezone
from ..core.database import get_db
from ..models.models import Conversation, Message, User
from ..schemas.schemas import (
    ConversationResponse,
    ConversationDetail,
    MessageResponse,
    ChatRequest,
    ChatResponse,
    CitationResponse,
)
from ..services.generation_service import generate_answer_with_citations
from ..auth import verify_jwt_token

# ---------------------------------------------------------------------------
# 路由初始化
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/conversations", tags=["Conversations"])


# ===========================================================================
# API 端点 - 对话 CRUD
# ===========================================================================

@router.post("", response_model=ConversationResponse)
async def create_conversation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """创建新对话
    为当前登录用户创建一个空白对话，标题默认为 "New Conversation"。

    Args:
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:ConversationResponse: 新创建的对话信息
    """
    # 新建一个对话记录，绑定到当前用户，存进数据库
    conversation = Conversation(title="New Conversation", user_id=current_user.id)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """获取当前用户的所有对话列表

    按更新时间倒序排列，只返回属于当前用户的对话。
    Args:
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns: List[ConversationResponse]: 对话列表
    """
    # 从数据库里查出当前用户的所有对话，按最近更新的排在前面
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return conversations


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """获取单个对话的详情（含全部消息）

    根据对话 ID 查询对话信息及其所有消息，消息按时间正序排列。
    Args:
        conversation_id: 对话唯一标识
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        ConversationDetail: 包含对话元信息和消息列表的详情对象
    """
    # 根据对话 ID 查数据库，同时确认这个对话属于当前用户
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # 查出这个对话下面所有的消息，按发送时间从早到晚排好
    messages_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()

    # 把对话信息和消息列表组装成一个完整的响应对象返回给前端
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        model_type=conversation.model_type,
        messages=[
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                citations=msg.citations or [],
                created_at=msg.created_at,
            )
            for msg in messages
        ],
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """删除指定对话

    验证对话归属后，从数据库中删除该对话及其关联消息（级联删除）。

    Args:
        conversation_id: 对话唯一标识
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        成功标志 {"success": True}
    """
    # 先确认这个对话存在，并且属于当前用户
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # 确认无误后，从数据库里删掉这个对话（关联的消息会自动一起删掉）
    await db.delete(conversation)
    await db.commit()
    return {"success": True}


@router.delete("/{conversation_id}/messages/{message_id}")
async def delete_message(
    conversation_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """删除对话中的单条消息

    验证对话归属后删除指定消息。如果删除后对话中没有任何消息了，
    则自动删除整个对话。

    Args:
        conversation_id: 对话唯一标识
        message_id: 消息唯一标识
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        包含 success 和 conversation_deleted 标志的字典
    """
    # --- 第一步：验证对话归属权 ---
    # 先确认这个对话是当前用户的，防止越权操作
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # --- 第二步：删除目标消息 ---
    # 直接从数据库里删掉这条消息
    await db.execute(delete(Message).where(Message.id == message_id))
    await db.commit()

    # --- 第三步：检查对话是否已空，空则自动清理 ---
    # 删完消息后看看这个对话里还有没有其他消息，没有的话就把整个对话也删了
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id)
    )
    remaining_messages = result.scalars().all()

    if not remaining_messages:
        # 对话里一条消息都没有了，把空对话也删掉，保持数据库干净
        await db.execute(delete(Conversation).where(Conversation.id == conversation_id))
        await db.commit()
        return {"success": True, "conversation_deleted": True}

    return {"success": True, "conversation_deleted": False}


# ===========================================================================
# 聊天路由 - 非流式对话补全
# ===========================================================================
router_chat = APIRouter(prefix="/chat", tags=["Chat"])


@router_chat.post("/completions", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_jwt_token)
):
    """非流式对话补全端点
    接收用户消息，调用生成服务产出回答和引用，保存对话记录后返回完整结果。

    Args:
        request: 包含 message、conversation_id 等字段的聊天请求体
        db: 异步数据库会话（自动注入）
        current_user: 通过 JWT 验证后注入的当前用户对象

    Returns:
        ChatResponse: 包含 answer、citations、conversation_id 的聊天响应
    """
    # --- 第一步：调用 AI 生成服务，获取回答和引用 ---
    try:
        # 把用户的问题发给 AI 生成服务，拿回回答内容和相关文献引用
        answer, citations = await generate_answer_with_citations(
            message=request.message,
            db=db,
        )
    except Exception as e:
        # 如果 AI 生成过程出错了，就返回一个友好的错误提示，不让整个请求崩掉
        print(f"生成回答失败：{e}")
        answer = f"抱歉，生成回答时出错：{str(e)}"
        citations = []

    # --- 第二步：将引用数据转换为标准响应格式 ---
    # 把 AI 返回的原始引用数据整理成前端需要的格式
    citation_responses = [
        CitationResponse(
            id=cit.get("id", ""),
            document_id=cit.get("document_id", ""),
            document_title=cit.get("document_title", ""),
            page=cit.get("page"),
            content=cit.get("content", ""),
            chunk_id=cit.get("chunk_id", ""),
        )
        for cit in citations
    ]

    # --- 第三步：如果没有指定对话 ID，自动创建新对话 ---
    conversation_id = request.conversation_id
    if not conversation_id:
        # 用户第一次提问没有对话 ID，就自动创建一个新的对话
        conversation = Conversation(title="New Conversation", user_id=current_user.id)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        conversation_id = conversation.id

    # --- 第四步：保存用户消息到数据库 ---
    # 把用户发的问题存到数据库的消息表里
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.message,
    )
    db.add(user_message)

    # --- 第五步：保存 AI 回答消息到数据库 ---
    # 把 AI 的回答也存到数据库里，这样用户下次打开对话还能看到历史记录
    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=answer,
        citations=citations,
    )
    db.add(assistant_message)

    # --- 第六步：如果是对话的第一轮问答，用问题内容自动生成对话标题 ---
    conv_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id)
    )
    messages = conv_result.scalars().all()
    if len(messages) == 2:  # 刚添加了 user + assistant 两条消息，说明是第一轮
        # 截取用户第一条消息的前 50 个字符作为对话标题，方便在列表中辨认
        title = request.message[:50] + "..." if len(request.message) > 50 else request.message
        conversation = await db.get(Conversation, conversation_id)
        if conversation:
            conversation.title = title
            conversation.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return ChatResponse(answer=answer, citations=citation_responses, conversation_id=conversation_id)

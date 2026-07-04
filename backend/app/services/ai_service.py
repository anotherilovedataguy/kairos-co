"""Unified AI dispatch for streaming chat and one-shot evaluation."""
from __future__ import annotations
import json
from typing import AsyncGenerator, List
from app.config import settings


async def stream_chat(
    provider: str,
    messages: List[dict],
    system_prompt: str,
) -> AsyncGenerator[str, None]:
    if provider == "claude":
        async for chunk in _stream_claude(messages, system_prompt):
            yield chunk
    elif provider == "chatgpt":
        async for chunk in _stream_openai(messages, system_prompt):
            yield chunk
    elif provider == "gemini":
        async for chunk in _stream_gemini(messages, system_prompt):
            yield chunk
    else:
        yield "AI provider not configured for this round."


async def evaluate_submission(
    provider: str,
    submission_content: str,
    criteria: str,
    round_type: str,
) -> dict:
    prompt = (
        f"You are an expert interviewer evaluating a candidate's {round_type} submission.\n"
        f"Evaluation criteria:\n{criteria}\n\n"
        f"Candidate submission:\n{submission_content}\n\n"
        "Respond ONLY with valid JSON in this exact format:\n"
        '{"score": <float 0-100>, "feedback": "<detailed feedback string>"}'
    )
    raw = await _one_shot(provider, prompt)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        return {"score": None, "feedback": raw}


# ── Claude ────────────────────────────────────────────────────────────────────

async def _stream_claude(messages: List[dict], system_prompt: str) -> AsyncGenerator[str, None]:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _one_shot_claude(prompt: str) -> str:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    msg = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _stream_openai(messages: List[dict], system_prompt: str) -> AsyncGenerator[str, None]:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=full_messages,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def _one_shot_openai(prompt: str) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content


# ── Gemini ────────────────────────────────────────────────────────────────────

async def _stream_gemini(messages: List[dict], system_prompt: str) -> AsyncGenerator[str, None]:
    import google.generativeai as genai
    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_prompt)
    gemini_messages = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["content"]]}
        for m in messages
    ]
    response = await model.generate_content_async(gemini_messages, stream=True)
    async for chunk in response:
        if chunk.text:
            yield chunk.text


async def _one_shot_gemini(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = await model.generate_content_async(prompt)
    return response.text


async def _one_shot(provider: str, prompt: str) -> str:
    if provider == "claude":
        return await _one_shot_claude(prompt)
    elif provider == "chatgpt":
        return await _one_shot_openai(prompt)
    elif provider == "gemini":
        return await _one_shot_gemini(prompt)
    return ""

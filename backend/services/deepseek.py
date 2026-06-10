"""
DeepSeek API client — lightweight wrapper.
Token is passed per-request, never stored on server.
"""
import requests
import json
import re

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEFAULT_MODEL = "deepseek-chat"


def call_deepseek(api_token: str, system_prompt: str, user_message: str,
                  temperature: float = 0.7, max_tokens: int = 2048) -> str:
    """
    Call DeepSeek chat API and return the assistant's text response.

    Args:
        api_token: User's DeepSeek API key (from request header)
        system_prompt: System message for the model
        user_message: User's input
        temperature: Sampling temperature
        max_tokens: Max output tokens

    Returns:
        The model's text response (raw string)

    Raises:
        ValueError: On API error or invalid token
    """
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        resp = requests.post(DEEPSEEK_API_URL, headers=headers,
                             json=payload, timeout=30)
    except requests.exceptions.Timeout:
        raise ValueError("请求超时，请检查网络后重试")
    except requests.exceptions.ConnectionError:
        raise ValueError("无法连接 DeepSeek API，请检查网络")

    if resp.status_code == 401:
        raise ValueError("API Token 无效，请在设置中重新输入")
    if resp.status_code == 429:
        raise ValueError("API 调用频率过高，请稍后重试")
    if resp.status_code != 200:
        try:
            err = resp.json()
            msg = err.get("error", {}).get("message", resp.text)
        except Exception:
            msg = resp.text
        raise ValueError(f"API 错误 ({resp.status_code}): {msg}")

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    return content


def extract_json_from_response(text: str) -> dict | list:
    """
    Extract JSON from model response. Handles cases where JSON
    is wrapped in ```json ... ``` code blocks or has trailing commas.
    """
    # Try to find JSON in markdown code blocks first
    code_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if code_match:
        text = code_match.group(1)

    # Try direct parse
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON array or object boundaries
    for start_char, end_char in [('[', ']'), ('{', '}')]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                continue

    raise ValueError(f"无法解析 AI 返回的数据，原始内容: {text[:300]}")

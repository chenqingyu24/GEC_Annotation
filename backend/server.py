import argparse
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from typing import Any, Dict, Optional


RULE_MODEL_ID = "rule-based-demo"
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEFAULT_PORT = 8003
MODEL_OPTIONS = [
    {
        "id": RULE_MODEL_ID,
        "label": "本地规则演示",
        "provider": "local",
        "requires_api_key": False,
    },
    {
        "id": "deepseek-v4-flash",
        "label": "DeepSeek V4 Flash",
        "provider": "deepseek",
        "requires_api_key": True,
    },
    {
        "id": "deepseek-v4-pro",
        "label": "DeepSeek V4 Pro",
        "provider": "deepseek",
        "requires_api_key": True,
    },
]


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class ModelServiceError(Exception):
    def __init__(self, message: str, status: int = HTTPStatus.BAD_GATEWAY) -> None:
        super().__init__(message)
        self.status = status


class ModelApiHandler(BaseHTTPRequestHandler):
    server_version = "GECModelApi/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path_without_query() != "/models":
            self.send_json({"detail": "Not Found"}, status=404)
            return

        self.send_json({"models": MODEL_OPTIONS})

    def do_POST(self) -> None:
        if self.path_without_query() != "/grammar-check":
            self.send_json({"detail": "Not Found"}, status=404)
            return

        try:
            payload = self.read_json()
            text = payload.get("text")
            model = payload.get("model")

            if not isinstance(text, str) or text.strip() == "":
                self.send_json({"detail": "text must be a non-empty string"}, status=400)
                return

            if not isinstance(model, str) or model.strip() == "":
                self.send_json({"detail": "model must be a non-empty string"}, status=400)
                return

            model_option = find_model_option(model)

            if model_option is None:
                self.send_json({"detail": f"unknown model: {model}"}, status=400)
                return

            if model == RULE_MODEL_ID:
                self.send_json(check_grammar(text))
                return

            api_key = self.read_bearer_token()

            if model_option["requires_api_key"] and api_key == "":
                self.send_json({"detail": "API Key is required for this model"}, status=401)
                return

            self.send_json(check_grammar_with_deepseek(text, model, api_key))
        except json.JSONDecodeError:
            self.send_json({"detail": "request body must be valid JSON"}, status=400)
        except ModelServiceError as service_error:
            self.send_json({"detail": str(service_error)}, status=service_error.status)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def path_without_query(self) -> str:
        return self.path.split("?", 1)[0]

    def read_json(self) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length).decode("utf-8")
        data = json.loads(body or "{}")

        if not isinstance(data, dict):
            raise json.JSONDecodeError("expected object", body, 0)

        return data

    def send_json(self, payload: Dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def read_bearer_token(self) -> str:
        authorization = self.headers.get("Authorization", "")

        if not authorization.lower().startswith("bearer "):
            return ""

        return authorization[7:].strip()


def find_model_option(model_id: str) -> Optional[Dict[str, Any]]:
    for model_option in MODEL_OPTIONS:
        if model_option["id"] == model_id:
            return model_option

    return None


def check_grammar(text: str) -> Dict[str, Any]:
    corrections = [
        ("我昨天去学校。", "我昨天去了学校。", "句子缺少动态助词“了”。"),
        ("他喜欢苹果。", "他喜欢苹果。", "未检测到明显语法错误。"),
    ]

    for source, corrected_text, explanation in corrections:
        if text == source:
            has_error = corrected_text != text
            return {
                "has_error": has_error,
                "corrected_text": corrected_text if has_error else "",
                "explanation": explanation,
            }

    return {
        "has_error": False,
        "corrected_text": "",
        "explanation": "规则演示模型未检测到明显语法错误。真实模型接入时请替换 backend/server.py 中的 check_grammar。",
    }


def check_grammar_with_deepseek(text: str, model: str, api_key: str) -> Dict[str, Any]:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是中文语法错误检测与纠错模型。只返回 JSON，不要输出 Markdown、解释性前后缀或代码块。"
                    "JSON 必须包含布尔字段 has_error；如有修改建议，可包含 corrected_text；可包含 explanation。"
                ),
            },
            {
                "role": "user",
                "content": f"请判断下面句子是否存在语法错误，并在需要时给出纠正句：\n{text}",
            },
        ],
        "response_format": {"type": "json_object"},
        "stream": False,
    }
    request = Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            response_body = response.read().decode("utf-8")
    except HTTPError as error:
        raise ModelServiceError(f"DeepSeek 请求失败 ({error.code})。", status=HTTPStatus.BAD_GATEWAY)
    except URLError as error:
        raise ModelServiceError(f"无法连接 DeepSeek 服务：{error.reason}", status=HTTPStatus.BAD_GATEWAY)
    except TimeoutError:
        raise ModelServiceError("DeepSeek 请求超时。", status=HTTPStatus.BAD_GATEWAY)

    try:
        api_result = json.loads(response_body)
    except json.JSONDecodeError:
        raise ModelServiceError("DeepSeek 返回的不是有效 JSON。")

    content = read_deepseek_message_content(api_result)

    try:
        grammar_result = json.loads(content)
    except json.JSONDecodeError:
        raise ModelServiceError("DeepSeek 返回内容不是严格 JSON。")

    return parse_grammar_result(grammar_result)


def read_deepseek_message_content(api_result: Any) -> str:
    if not isinstance(api_result, dict):
        raise ModelServiceError("DeepSeek 响应必须是 JSON 对象。")

    choices = api_result.get("choices")

    if not isinstance(choices, list) or len(choices) == 0:
        raise ModelServiceError("DeepSeek 响应缺少 choices。")

    first_choice = choices[0]

    if not isinstance(first_choice, dict):
        raise ModelServiceError("DeepSeek choices[0] 必须是 JSON 对象。")

    message = first_choice.get("message")

    if not isinstance(message, dict) or not isinstance(message.get("content"), str):
        raise ModelServiceError("DeepSeek 响应缺少 message.content。")

    return message["content"]


def parse_grammar_result(data: Any) -> Dict[str, Any]:
    if not isinstance(data, dict):
        raise ModelServiceError("语法分析响应必须是 JSON 对象。")

    if not isinstance(data.get("has_error"), bool):
        raise ModelServiceError("语法分析响应必须包含布尔字段 has_error。")

    result = {"has_error": data["has_error"]}

    if isinstance(data.get("corrected_text"), str):
        result["corrected_text"] = data["corrected_text"]

    if isinstance(data.get("explanation"), str):
        result["explanation"] = data["explanation"]

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Local grammar-check model API demo server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=DEFAULT_PORT, type=int)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), ModelApiHandler)
    print(f"Model API server running at http://{args.host}:{args.port}")
    print("Available models: " + ", ".join(model["id"] for model in MODEL_OPTIONS))
    server.serve_forever()


if __name__ == "__main__":
    main()

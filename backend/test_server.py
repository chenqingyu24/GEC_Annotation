import json
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from unittest.mock import patch

from server import ModelApiHandler


class BackendServerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), ModelApiHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def test_models_endpoint_returns_model_descriptions_and_cors_headers(self) -> None:
        response, body = self.request("GET", "/models")

        self.assertEqual(response.status, 200)
        self.assertEqual(response.getheader("Access-Control-Allow-Origin"), "*")
        self.assertEqual(
            json.loads(body),
            {
                "models": [
                    {
                        "id": "rule-based-demo",
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
            },
        )

    def test_grammar_check_returns_strict_json_result(self) -> None:
        response, body = self.request(
            "POST",
            "/grammar-check",
            {"text": "我昨天去学校。", "model": "rule-based-demo"},
        )

        self.assertEqual(response.status, 200)
        data = json.loads(body)
        self.assertEqual(data["has_error"], True)
        self.assertEqual(data["corrected_text"], "我昨天去了学校。")
        self.assertIn("了", data["explanation"])

    def test_deepseek_model_requires_api_key(self) -> None:
        response, body = self.request(
            "POST",
            "/grammar-check",
            {"text": "我昨天去学校。", "model": "deepseek-v4-flash"},
        )

        self.assertEqual(response.status, 401)
        self.assertIn("API Key", json.loads(body)["detail"])

    @patch("server.urlopen", create=True)
    def test_deepseek_model_is_proxied_as_openai_compatible_chat_request(self, urlopen_mock) -> None:
        urlopen_mock.return_value = FakeDeepSeekResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "has_error": True,
                                    "corrected_text": "我昨天去了学校。",
                                    "explanation": "缺少动态助词“了”。",
                                },
                                ensure_ascii=False,
                            )
                        }
                    }
                ]
            }
        )

        response, body = self.request(
            "POST",
            "/grammar-check",
            {"text": "我昨天去学校。", "model": "deepseek-v4-flash"},
            headers={"Authorization": "Bearer test-key"},
        )

        self.assertEqual(response.status, 200)
        data = json.loads(body)
        self.assertEqual(data["has_error"], True)
        self.assertEqual(data["corrected_text"], "我昨天去了学校。")
        deepseek_request = urlopen_mock.call_args.args[0]
        request_body = json.loads(deepseek_request.data.decode("utf-8"))
        self.assertEqual(deepseek_request.full_url, "https://api.deepseek.com/chat/completions")
        self.assertEqual(deepseek_request.get_header("Authorization"), "Bearer test-key")
        self.assertEqual(request_body["model"], "deepseek-v4-flash")
        self.assertFalse(request_body["stream"])
        self.assertIn("只返回 JSON", request_body["messages"][0]["content"])
        self.assertIn("我昨天去学校。", request_body["messages"][1]["content"])

    def test_options_preflight_is_supported(self) -> None:
        connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.request(
            "OPTIONS",
            "/grammar-check",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )

        response = connection.getresponse()
        response.read()
        connection.close()

        self.assertEqual(response.status, 204)
        self.assertEqual(response.getheader("Access-Control-Allow-Origin"), "*")
        self.assertIn("POST", response.getheader("Access-Control-Allow-Methods"))

    def request(self, method: str, path: str, payload: dict | None = None, headers: dict | None = None):
        connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
        body = "" if payload is None else json.dumps(payload, ensure_ascii=False)
        request_headers = {"Content-Type": "application/json"} if payload is not None else {}
        request_headers.update(headers or {})
        connection.request(method, path, body=body.encode("utf-8"), headers=request_headers)
        response = connection.getresponse()
        response_body = response.read().decode("utf-8")
        connection.close()
        return response, response_body


class FakeDeepSeekResponse:
    def __init__(self, payload: dict):
        self.payload = payload
        self.status = 200

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(self.payload, ensure_ascii=False).encode("utf-8")


if __name__ == "__main__":
    unittest.main()

# 中文语法纠错多候选对齐工具

## 项目简介

这是一个基于 React、TypeScript 和 Vite 的浏览器端工具，用于对中文语法纠错场景中的原句、参考答案和多个候选句进行字符级差异对齐。应用会生成编辑组表格、多行高亮视图和 JSON 预览，便于人工检查不同候选输出和参考答案在同一原句上的修改位置。

## 环境要求

- Node.js 18 或更高版本。
- npm。项目的 `package.json` 使用 npm scripts。
- 本仓库也包含 `pnpm-lock.yaml`，使用 pnpm 的用户可用 `pnpm install` 安装依赖。

## 安装

```bash
npm install
```

如使用 pnpm：

```bash
pnpm install
```

## 启动

```bash
npm run dev
```

Vite 会在终端输出本地访问地址，通常是 `http://localhost:5173/`。

## 启动本地模型后端

仓库包含一个无第三方依赖的本地模型代理后端，用于先跑通“模型分析”面板。它提供 `GET /models` 和 `POST /grammar-check`，默认包含本地演示模型 `rule-based-demo`，并可代理 DeepSeek 的 OpenAI-compatible Chat API。

如果已创建 conda 环境，可以直接运行：

```bat
backend\start_backend_conda.bat
```

首次创建环境：

```bash
D:\Anaconda\Scripts\conda.exe env create -f backend\environment.yml
```

也可以手动用 Python 启动：

```bash
python backend/server.py --host 127.0.0.1 --port 8001
```

如果使用 Codex bundled Python：

```bash
C:\Users\XY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe backend/server.py --host 127.0.0.1 --port 8001
```

前端默认连接 `http://127.0.0.1:8001`，页面不会暴露服务地址输入框。如需改后端地址，可在启动 Vite 前设置 `VITE_MODEL_API_BASE_URL`。真实本地 GEC 模型接入时，可以替换 `backend/server.py` 中的 `check_grammar` 函数；真实 DeepSeek 调用需要在页面填写 API Key。

## 测试

```bash
npm run test
```

测试使用 Vitest，覆盖输入解析、字符级 diff、编辑合并、编辑分组、渲染数据构建等核心逻辑。人工验收样例位于 `test-cases/gec-alignment-cases.json`，包含任务书要求的 20 类情况。

## 构建

```bash
npm run build
```

该命令会先运行 TypeScript 项目构建，再执行 Vite 生产构建。

## 手动输入使用

1. 在“手动输入”区域填写原句 `source`。
2. 可填写 0 条或多条参考答案。手动输入中，空白参考答案会被忽略。
3. 填写至少 1 条候选句。手动输入中，空白候选句会被忽略。
4. 点击生成按钮后，页面会显示当前样本的编辑组表格、多行高亮和 JSON 预览。
5. 清空按钮会清除当前手动输入和结果。

手动输入生成的样本 id 为 `manual_sample`，候选句 id 会按顺序生成 `candidate_1`、`candidate_2` 等。

## JSON 上传格式

上传文件必须是 JSON，可以是单个样本对象，也可以是样本对象数组。

单样本示例：

```json
{
  "id": "sample_1",
  "source": "他喜欢苹果。",
  "references": ["他喜欢香蕉。"],
  "candidates": [
    { "id": "model_a", "text": "他喜欢香蕉。" },
    { "id": "model_b", "text": "他喜欢苹果。" }
  ]
}
```

多样本示例：

```json
[
  {
    "id": "sample_1",
    "source": "我昨天去学校。",
    "references": ["我昨天去了学校。"],
    "candidates": [{ "id": "model_a", "text": "我昨天去了学校。" }]
  },
  {
    "id": "sample_2",
    "source": "他喜欢苹果。",
    "references": [],
    "candidates": [{ "id": "model_b", "text": "他喜欢香蕉。" }]
  }
]
```

字段说明：

- `id`：可选字符串。为空或缺失时会生成 `sample_1`、`sample_2` 等默认 id。
- `source`：必填字符串，不能是空字符串。
- `references`：可选字符串数组。JSON 中的空字符串会被忽略，空白字符串会保留。
- `candidates`：必填数组，至少包含 1 条候选。每条候选需要 `text` 字符串，`id` 可选。
- 候选 id 与已有 reference id 或其他候选 id 冲突时，会自动追加 `_2`、`_3` 等后缀，避免覆盖。

## 多样本切换

上传多样本 JSON 后，页面会显示样本导航。可以使用上一条、下一条按钮，或下拉框选择样本。应用只对当前选中的样本构建并展示对齐结果，切换样本时会重置当前选中的编辑组。

## 模型分析接口

结果区包含“模型分析”面板，即使未加载样本也会显示。面板可接入大模型 API、本地中文语法纠错模型或本地中文语法检测模型。使用时可填写大模型 API Key，点击“刷新模型”获取模型列表，然后输入待分析文本，或在页面中拖选文本后点击“大模型分析”。如果同时存在页面选中文本和面板文本框内容，优先分析页面选中文本。API Key 只保存在当前页面会话中，刷新页面后会清空。

前端默认通过本地模型代理后端访问模型服务。后端提供以下接口。

模型列表：

```http
GET /models
Authorization: Bearer <api-key>
```

响应可以是通用格式：

```json
{
  "models": [
    {
      "id": "rule-based-demo",
      "label": "本地规则演示",
      "provider": "local",
      "requires_api_key": false
    },
    {
      "id": "deepseek-v4-flash",
      "label": "DeepSeek V4 Flash",
      "provider": "deepseek",
      "requires_api_key": true
    }
  ]
}
```

前端也兼容旧字符串数组和 OpenAI-compatible 格式：

```json
{
  "data": [
    { "id": "gec-model-a" },
    { "id": "gec-model-b" }
  ]
}
```

语法分析：

```http
POST /grammar-check
Content-Type: application/json
Authorization: Bearer <api-key>
```

请求：

```json
{
  "text": "我昨天去学校。",
  "model": "gec-model-a"
}
```

响应必须是 JSON，并包含 `has_error`：

```json
{
  "has_error": true,
  "corrected_text": "我昨天去了学校。",
  "explanation": "句子缺少动态助词“了”。"
}
```

模型返回的纠正句只会展示在页面中，不会自动修改当前样本、候选句或 JSON 预览。

## 主要限制说明

- 对齐算法是字符级 LCS diff，不进行分词、语义判断或模型推理。
- 短距离调序会表现为替换等普通编辑，不提供独立的 `move` 或 `reorder` 操作。
- 单个 source 与单个 target 的 LCS 计算量上限为 `2_000_000` 个 DP cell；超过上限会提示错误。
- JSON 文件超过 10MB 时会显示性能警告，但仍会尝试读取和解析。
- 多样本 JSON 的建议样本数不超过 3000 条；超过时会显示性能提示，但不会强制阻止上传。
- 手动输入会过滤 trim 后为空的参考答案和候选句；JSON 输入会保留候选文本原文，仅忽略 references 中的精确空字符串。
- 当前应用在浏览器端运行，不包含后端存储、用户登录或文件导出；模型分析依赖用户提供的外部或本地 HTTP 服务。

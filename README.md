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

## 主要限制说明

- 对齐算法是字符级 LCS diff，不进行分词、语义判断或模型推理。
- 短距离调序会表现为替换等普通编辑，不提供独立的 `move` 或 `reorder` 操作。
- 单个 source 与单个 target 的 LCS 计算量上限为 `2_000_000` 个 DP cell；超过上限会提示错误。
- JSON 文件超过 10MB 时会显示性能警告，但仍会尝试读取和解析。
- 多样本 JSON 的建议样本数不超过 3000 条；超过时会显示性能提示，但不会强制阻止上传。
- 手动输入会过滤 trim 后为空的参考答案和候选句；JSON 输入会保留候选文本原文，仅忽略 references 中的精确空字符串。
- 当前应用在浏览器端运行，不包含后端存储、用户登录、文件导出或远程模型调用。

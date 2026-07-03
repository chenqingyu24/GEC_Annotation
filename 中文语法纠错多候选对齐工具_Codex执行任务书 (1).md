# Codex 执行任务书：中文语法纠错多候选对齐与高亮展示工具

## 1. 任务目标

请实现一个“中文语法纠错多候选对齐与高亮展示工具”的第一版原型。

核心目标：

用户可以手动输入一个原句、多个参考答案、多个候选句，也可以上传 JSON 文件。系统以原句为中心，对参考答案和候选句做字符级 diff，提取 `replace`、`delete`、`insert`，合并相邻小编辑，生成 `edit_groups` 和 `render_lines`，并用表格和多行高亮方式展示修改差异。

本版本只展示差异，不判断修改是否正确。

---

## 2. 技术要求

使用：

```text
React + TypeScript + Vite
```

要求：

1. 不需要后端服务；
2. 所有逻辑在前端完成；
3. 不使用数据库；
4. 不接入 ChERRANT；
5. 不做正确、过纠、漏纠判断；
6. 不做自动评分；
7. 不单独识别调序，调序统一作为 `replace` 展示；
8. 项目需要保证 `npm install` 后 `npm run dev` 可以启动；
9. 项目需要提供 `npm run test` 和 `npm run build`；
10. 核心算法需要使用 Vitest 编写单元测试。

---

## 3. 建议文件结构

```text
README.md
test-cases/
  gec-alignment-cases.json
src/
  App.tsx
  main.tsx
  types.ts
  styles.css
  utils/
    diff.ts
    mergeEdits.ts
    groupEdits.ts
    parseInput.ts
    renderText.ts
    buildDiffView.ts
    *.test.ts
  components/
    ManualInputPanel.tsx
    JsonUploadPanel.tsx
    SampleNavigator.tsx
    EditGroupTable.tsx
    HighlightView.tsx
    JsonPreview.tsx
```

文件结构可以微调，但功能模块需要清晰分离。

---

## 4. 核心类型

请在 `types.ts` 中定义核心类型。

```ts
export type EditOp = "replace" | "delete" | "insert" | "equal" | "anchor";

export interface Candidate {
  id: string;
  text: string;
}

export interface Sample {
  id: string;
  source: string;
  references: string[];
  candidates: Candidate[];
}

export interface Target {
  id: string;
  type: "reference" | "candidate";
  text: string;
}

export interface Edit {
  op: "replace" | "delete" | "insert";
  source_start: number;
  source_end: number;
  source_text: string;
  target_start: number;
  target_end: number;
  target_text: string;
  target_id?: string;
  target_type?: "reference" | "candidate";
}

export interface EditGroupItemSegment {
  text: string;
  op: EditOp;
}

export interface EditGroupItem {
  text: string;
  op: EditOp;
  segments: EditGroupItemSegment[];
}

export interface EditGroup {
  group_id: string;
  source_start: number;
  source_end: number;
  source_text: string;
  items: Record<string, EditGroupItem>;
}

export type SegmentType = "plain" | "replace" | "delete" | "insert" | "anchor";

export interface RenderSegment {
  text: string;
  type: SegmentType;
  group_id?: string;
  op?: EditOp;
}

export interface RenderLine {
  id: string;
  type: "source" | "reference" | "candidate";
  label: string;
  text: string;
  segments: RenderSegment[];
}

export interface DiffView {
  id: string;
  source: string;
  targets: Target[];
  edit_groups: EditGroup[];
  render_lines: RenderLine[];
}
```

要求：

```text
EditGroupTable 使用 edit_groups；
HighlightView 使用 render_lines；
HighlightView 不要通过字符串搜索 edit_group.items.text 来定位高亮。
```

补充要求：

1. `anchor` 只用于展示层占位，表示纯插入位置上的对齐锚点，不是原始 diff 操作；
2. `Edit.op` 仍然只允许 `replace`、`delete`、`insert`；
3. `EditGroupItem.text` 表示该 target 在整个 group 范围内的最终展示文本；
4. `EditGroupItem.segments` 表示该 group 内部更细粒度的展示片段，表格渲染时优先使用 `segments`。

---

## 5. 页面功能

### 5.1 手动输入区

实现手动输入面板。

功能要求：

1. 原句输入框固定一个，必填；
2. 参考答案为动态输入列表；
3. 参考答案可增加、删除；
4. 参考答案可为空；
5. 候选句为动态输入列表；
6. 候选句可增加、删除；
7. 候选句至少一条；
8. 生成结果时自动忽略空参考答案输入框；
9. 生成结果时自动忽略空候选句输入框；
10. 参考答案按当前顺序自动命名为 `ref_1`、`ref_2`；
11. 候选句按当前顺序自动命名为 `candidate_1`、`candidate_2`；
12. 如果忽略空输入框后没有有效候选句，显示错误提示。

页面示意：

```text
【原句】
[ 他对这个问题感到很有兴趣。 ]

【参考答案】
[ 他对这个问题很感兴趣。 ]      [删除]
[ 他对这个问题很有兴趣。 ]      [删除]
[ 添加参考答案 ]

【候选句】
[ 他对这个问题很感兴趣。 ]      [删除]
[ 他对这个问题非常感兴趣。 ]    [删除]
[ 他对这个题目很感兴趣。 ]      [删除]
[ 添加候选句 ]

[生成对齐结果] [清空]
```

### 5.2 手动输入保留原始空格

手动输入时，判断是否为空可以使用 `trim()`，但保存文本时必须保留原始字符串。

实现规则：

```ts
if (value.trim() === "") {
  // ignore
} else {
  // keep original value, do not trim
}
```

不要对 `source`、`references`、`candidates` 的文本内容自动 trim。

原因：需要支持句首空格、句尾空格和句中空格的可视化差异。

### 5.3 JSON 上传区

实现 JSON 文件上传功能。

支持两种 JSON 格式：

#### 单样本 JSON

```json
{
  "id": "sample_001",
  "source": "他对这个问题感到很有兴趣。",
  "references": [
    "他对这个问题很感兴趣。"
  ],
  "candidates": [
    {
      "id": "model_a",
      "text": "他对这个问题很感兴趣。"
    }
  ]
}
```

#### 多样本 JSON 数组

```json
[
  {
    "id": "sample_001",
    "source": "他对这个问题感到很有兴趣。",
    "references": [
      "他对这个问题很感兴趣。"
    ],
    "candidates": [
      {
        "id": "model_a",
        "text": "他对这个问题很感兴趣。"
      }
    ]
  }
]
```

JSON 校验要求：

1. `source` 必须是非空字符串；
2. `references` 可选；
3. 如果存在 `references`，必须是字符串数组；
4. `references` 中的空字符串自动忽略；
5. `candidates` 必须是数组；
6. `candidates` 至少包含一条有效候选句；
7. `candidates[].text` 必须是字符串；
8. `candidates[].text === ""` 是允许的，表示模型输出为空，应展示为全句删除；
9. `candidates[].id` 可选；
10. 如果缺少样本 id，自动生成 `sample_1`、`sample_2`；
11. 如果缺少候选句 id，自动生成 `candidate_1`、`candidate_2`；
12. 如果 candidate id 重复，或与任一 target id 冲突，自动改成 `model_a`、`model_a_2`、`model_a_3`；
13. JSON 格式错误时显示错误提示，不要让页面崩溃。

target id 唯一性要求：

1. reference id 永远由系统生成：`ref_1`、`ref_2`；
2. candidate id 优先使用 JSON 中的原始 id；
3. candidate id 缺失时自动生成：`candidate_1`、`candidate_2`；
4. 所有 target id 必须全局唯一；
5. 如果 candidate id 与 reference id、已有 candidate id 或自动生成 id 冲突，则按 `base`、`base_2`、`base_3` 的规则后缀化；
6. 不能因为 id 冲突导致 `edit_group.items` 的列互相覆盖。

多样本 JSON 校验失败策略：

1. 顶层 JSON 既不是对象也不是数组时，整文件拒绝；
2. 多样本数组为空时，整文件拒绝；
3. 多样本数组中只要任一样本非法，整文件拒绝；
4. 失败时不更新 `samples`，也不覆盖当前已展示结果；
5. 错误信息必须包含样本序号或样本 id，例如：`第 3 个样本校验失败：source 必须是非空字符串。`

### 5.4 JSON 空字符串处理规则

解析 JSON 时按以下规则处理空字符串：

| 位置 | 处理方式 |
|---|---|
| `references` 中的空字符串 | 忽略 |
| `candidates[].text` 为空字符串 | 保留 |
| `source` 为空字符串 | 报错 |
| 手动输入空参考答案 | 忽略 |
| 手动输入空候选句 | 忽略 |

候选句 `text: ""` 表示模型输出为空，需要展示为全句删除。

JSON 空白字符串补充规则：

1. JSON 中只把严格的空字符串 `""` 视为空；
2. `source === ""` 报错，`source === "   "` 有效并原样保留；
3. `references` 中的 `""` 忽略，`"   "` 有效并原样保留；
4. `candidates[].text === ""` 有效，表示模型输出为空；
5. `candidates[].text === "   "` 有效，表示模型输出为空格；
6. 手动输入仍然使用 `trim()` 判断是否为空，但保存非空输入时必须保留原始字符串。

### 5.5 文件规模提示与按需计算

第一版支持中小规模 JSON 文件上传。

实现要求：

1. 如果上传文件超过 10MB，给出提示：`文件较大，可能影响页面性能`；
2. 不强制禁止上传，但需要提示；
3. 建议样本数量不超过 3000 条；
4. 上传多样本 JSON 后，只解析并保存 `samples` 列表；
5. 默认选中第一个样本；
6. 只对当前选中的样本调用 `buildDiffView(sample)`；
7. 切换上一条、下一条或下拉选择样本时，再对新样本调用 `buildDiffView(sample)`；
8. 不要在上传完成后循环处理全部 samples；
9. 如果样本数量超过 3000 条，给出建议提示，但不强制禁止上传；
10. 对当前样本执行字符级 LCS 前，需要检查每个 source-target 的计算量；
11. 如果 `sourceChars.length * targetChars.length > 2_000_000`，拒绝对当前样本执行 diff，并显示错误提示：`当前样本文本过长，字符级对齐计算量过大，请缩短 source 或 candidate/reference 后重试。`

推荐写法：

```ts
const [samples, setSamples] = useState<Sample[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);

const currentSample = samples[currentIndex];

const currentView = useMemo(() => {
  if (!currentSample) return null;
  return buildDiffView(currentSample);
}, [currentSample]);
```

### 5.6 样本切换区

上传多样本 JSON 后，显示样本切换区。

功能要求：

1. 显示当前样本 id；
2. 支持上一条；
3. 支持下一条；
4. 支持下拉选择样本；
5. 切换样本时必须重新生成该样本的展示结果；
6. 切换样本时不能保留旧样本的 `edit_groups`、`render_lines`、表格或高亮内容。

### 5.7 结果展示区

结果展示区包含：

1. 编辑组表格；
2. 多行高亮视图；
3. JSON 预览；
4. 错误提示；
5. 无修改提示。

如果当前样本没有任何修改，显示：

```text
该样本没有检测到修改。
```

---

## 6. 算法实现

### 6.1 统一目标列表

对每个样本生成统一 `targets`：

```ts
const targets: Target[] = [
  ...references.map((text, i) => ({
    id: `ref_${i + 1}`,
    type: "reference",
    text
  })),
  ...candidates.map((cand) => ({
    id: cand.id,
    type: "candidate",
    text: cand.text
  }))
];
```

所有 target 都与 source 对齐。

如果 `references = []`，则 `targets` 中不包含 reference 类型的 target，表格不要显示空的 `ref_1` 或 `ref_2` 列。

构造 `targets` 时必须先完成 candidate id 全局唯一化，避免 `Record<string, EditGroupItem>` 被重复 key 覆盖。

### 6.2 字符级 diff

固定使用 TypeScript 实现字符级 LCS diff，不依赖 Python `difflib`。

实现：

```ts
function charDiff(source: string, target: string): Edit[]
```

要求：

1. 使用 `Array.from(source)` 和 `Array.from(target)` 转为字符数组；
2. 所有索引均按字符数组索引计算；
3. 输出 `replace`、`delete`、`insert`；
4. 不输出 `equal`；
5. 标点、空格、换行都参与 diff；
6. 调序不单独识别，统一作为 `replace/delete/insert` 的组合，最终展示时可合并为 `replace`；
7. `charDiff` 只负责确定性的基础 LCS diff，不负责复杂展示优化；
8. `charDiff` 回溯时必须使用固定优先级：
   - 字符相等：走 equal，`i--, j--`；
   - `dp[i - 1][j] > dp[i][j - 1]`：输出 delete，`i--`；
   - `dp[i - 1][j] < dp[i][j - 1]`：输出 insert，`j--`；
   - 两者相等时：优先 delete，`i--`；
9. 相邻 delete + insert 折叠为 replace、短距离调序合并等展示友好化逻辑放在 `mergeNearbyEdits` 中完成。

### 6.3 相邻编辑合并

实现：

```ts
function mergeNearbyEdits(
  source: string,
  target: string,
  edits: Edit[],
  maxGap?: number
): Edit[]
```

默认 `maxGap = 2`。

合并条件：

只有同时满足以下条件才合并相邻编辑：

```text
两个编辑之间未修改字符数 ≤ 2；
合并后的 source_text 长度 ≤ 12；
合并后的 target_text 长度 ≤ 12；
两个编辑之间的未修改片段不包含明显标点。
```

明显标点包括：

```text
，。！？；：、,.!?;:
```

合并后的 op 规则：

| 合并前情况 | 合并后类型 |
|---|---|
| 只有 delete | delete |
| 只有 insert | insert |
| 只有 replace | replace |
| delete + insert | replace |
| delete + replace | replace |
| insert + replace | replace |
| delete + insert + replace | replace |

合并时需要重新计算：

```ts
source_start
source_end
source_text
target_start
target_end
target_text
```

调序展示补充规则：

1. 不新增 `move` 或 `reorder` 类型；
2. 如果一组合并候选编辑中同时包含 delete 和 insert，且满足上述 `maxGap`、长度和标点条件，则合并后的 op 统一为 `replace`；
3. 该规则用于把短距离调序作为 replace 展示，例如 `把作业昨天 → 昨天把作业`。

### 6.4 多目标编辑提取

实现：

```ts
function buildDiffView(sample: Sample): DiffView
```

返回：

```ts
{
  id: sample.id,
  source: sample.source,
  targets,
  edit_groups,
  render_lines
}
```

流程：

1. 构造 `targets`；
2. 对每个 target 执行 `charDiff(source, target.text)`；
3. 对 raw edits 执行 `mergeNearbyEdits`；
4. 给每个 edit 增加 `target_id` 和 `target_type`；
5. 汇总为 `all_edits`；
6. 执行 `groupOverlappingEdits`，生成 `edit_groups`；
7. 执行 `buildRenderLines`，生成 `render_lines`；
8. 返回 `DiffView`。

### 6.5 edit_group 分组

实现：

```ts
function groupOverlappingEdits(
  source: string,
  targets: Target[],
  allEdits: Edit[]
): EditGroup[]
```

规则：

1. 不同 target 的 edit 只要 source span 重叠，就放入同一个 `edit_group`；
2. `edit_group.source_start` 取所有重叠 edit 的最小 start；
3. `edit_group.source_end` 取所有重叠 edit 的最大 end；
4. `source_text = sourceChars.slice(source_start, source_end).join("")`；
5. 插入 edit 的 `source_start == source_end`；
6. 插入位置距离已有 `edit_group` 边界 ≤ 1 个字符时，合并到该 `edit_group`；
7. 否则插入 edit 单独成组；
8. 纯插入 `edit_group` 的 `source_text` 可为空，但展示时必须显示 `/\`；
9. 对每个 `edit_group`，需要为所有 targets 填充 `items`；
10. 如果某个 target 在该 `edit_group` 中没有修改，填入原句片段，`op = "equal"`；
11. 如果某个 target 删除整个 group，item text 为被删除文本，`op = "delete"`；
12. 如果某个 target 插入内容，item text 为插入内容，`op = "insert"`；
13. 如果某个 target 替换内容，item text 为 target 在整个 group 范围内对应的最终文本，`op = "replace"`；
14. 如果是纯插入 group，且某个 target 没有插入内容，item text 为空字符串，`op = "anchor"`；
15. 每个 item 必须填充 `segments`，用于表达 group 内部的细粒度 equal/delete/insert/replace/anchor 片段。

### 6.6 edit_group.items.text 计算规则修订

`edit_group.items[target_id].text` 不能简单使用单个 edit 的 `target_text`。

它必须表示：

```text
该 target 在整个 edit_group 原句范围内对应的最终展示文本。
```

实现要求：

1. 对每个 `edit_group`，先确定 `group_start` 和 `group_end`；
2. `source_text = sourceChars.slice(group_start, group_end).join("")`；
3. 对每个 target，计算该 target 在整个 group 范围内最终对应的文本；
4. 如果该 target 在该 group 中没有修改，显示 group 的 `source_text`，`op = "equal"`，`segments = [{ text: source_text, op: "equal" }]`；
5. 如果该 target 删除整个 group，显示被删除内容，`op = "delete"`，`segments = [{ text: source_text, op: "delete" }]`；
6. 如果该 target 插入内容，显示插入内容，`op = "insert"`，`segments = [{ text: insertedText, op: "insert" }]`；
7. 如果该 target 替换内容，显示替换后的 group 文本，`op = "replace"`，并在 `segments` 中保留 group 内部细粒度变化；
8. 如果该 target 只是局部删除、局部插入或局部替换，item 总 `op = "replace"`，但 `segments` 必须保留内部的 `equal/delete/insert/replace`；
9. 对纯插入 group，没有插入的 target 使用 `op = "anchor"`，`segments = [{ text: "", op: "anchor" }]`，展示为空插入符号 `/\`，不要显示空白。

注意：如果 group 是由多个重叠 edit 合并得到的，必须基于整个 group 范围计算 target 展示文本，而不是只使用某个局部 edit 的 `target_text`。

示例：

```ts
{
  text: "很有兴趣",
  op: "replace",
  segments: [
    { text: "感到", op: "delete" },
    { text: "很有兴趣", op: "equal" }
  ]
}
```

### 6.7 edit_groups 排序

实现排序：

```ts
editGroups.sort((a, b) => {
  if (a.source_start !== b.source_start) {
    return a.source_start - b.source_start;
  }

  const aInsert = a.source_start === a.source_end;
  const bInsert = b.source_start === b.source_end;

  if (aInsert !== bInsert) return aInsert ? 1 : -1;
  return 0;
});
```

要求：

1. 句首插入显示在第一个字符前；
2. 句尾插入显示在最后一个字符后；
3. 句中插入显示在对应位置之后；
4. 排序需要稳定，避免切换样本时顺序跳动。

### 6.8 render_lines 生成

实现：

```ts
function buildRenderLines(
  source: string,
  targets: Target[],
  editGroups: EditGroup[],
  allEdits: Edit[]
): RenderLine[]
```

要求：

1. 生成原句行；
2. 生成每个参考答案行；
3. 生成每个候选句行；
4. 每一行由 `RenderSegment[]` 组成；
5. 普通文本 segment 的 `type = "plain"`；
6. 替换文本 segment 的 `type = "replace"`，带 `group_id`；
7. 删除占位 segment 的 `type = "delete"`，带 `group_id`；
8. 插入 segment 的 `type = "insert"`，带 `group_id`；
9. 原句侧纯插入位置生成 text 为空字符串、`type = "anchor"` 或 `op = "anchor"` 的 segment，由展示组件渲染为 `/\`；
10. 目标句侧插入内容生成 text 为插入内容、`type = "insert"` 的 segment，由展示组件渲染为 `/插入内容\`；
11. 删除 segment 中的 text 是被删除内容，由展示组件负责渲染成 `[文字]` 并加删除线；
12. source 行和 target 行都使用统一 diff 标记：删除两侧都显示删除占位，插入 source 侧显示 `/\`、target 侧显示 `/插入内容\`，替换 source 侧显示原句片段、target 侧显示目标片段；
13. 不要在 `HighlightView` 中通过字符串查找 edit 文本位置。

---

## 7. 展示规则

### 7.1 替换

替换直接显示目标文本。

例如：

```text
问题 → 题目
```

表格中显示：

| 原句片段 | candidate |
|---|---|
| 问题 | 题目 |

### 7.2 删除

删除使用红色标记。

格式：

```text
[被删除内容]
```

视觉要求：

1. 被删除文字放在方括号内部；
2. 被删除文字使用 CSS 原生删除线；
3. 删除线使用 `text-decoration: line-through`，不再使用旋转斜线覆盖；
4. 不要把反斜线放在文字前面或后面；
5. 候选句中虽然没有该内容，也要显示删除占位符；
6. 表格和高亮视图使用同一套删除样式。

示例：

```text
原句：      [好的，]我明天去学校。
candidate：[好的，]我明天去学校。
```

不要显示成：

```text
[\]好的，
[好的，\]
```

建议实现：

```tsx
function DeleteMark({ text }: { text: string }) {
  return (
    <span className="delete-mark">
      [<span className="delete-text">{text}</span>]
    </span>
  );
}
```

建议 CSS：

```css
.delete-mark {
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 1px 4px;
}

.delete-text {
  display: inline;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}
```

### 7.3 插入

插入使用绿色标记。

格式：

```text
原句侧：/\
目标句侧：/插入内容\
```

示例：

```text
原句：      我昨天去/\学校。
candidate：我昨天去/了\学校。
```

要求：

1. 原句侧只显示 `/\`；
2. 原句侧不能显示“插入点”文字；
3. 目标句侧显示 `/插入内容\`；
4. 原句侧和目标句侧插入标记颜色一致；
5. 表格和高亮视图使用同一套插入样式。

建议实现：

```tsx
function InsertMark({ text }: { text: string }) {
  return (
    <span className="insert-mark">
      {`/${text}\\`}
    </span>
  );
}
```

如果 `text === ""`，显示：

```text
/\
```

### 7.4 纯插入 group 的展示

如果某个 `edit_group` 是纯插入，`source_text` 为空字符串。

展示要求：

```text
原句侧显示：/\
插入 target 显示：/插入内容\
未插入 target 显示：/\
```

表格示例：

| 原句片段 | ref_1 | candidate_1 |
|---|---|---|
| /\ | /了\ | /\ |

不要让纯插入 group 的原句片段或未插入 target 显示为空白。

### 7.5 空白字符展示

本版本不做不可见字符替换。

要求：

1. 不再实现 `visualizeInvisible(text)`；
2. 不把普通空格替换为 `␠`；
3. 不把制表符替换为 `⇥`；
4. 不把换行符替换为 `↵`；
5. 数据层必须保留原始空格、制表符和换行；
6. 展示层通过 CSS `white-space: pre-wrap` 保留原始空白字符。

### 7.6 长句自动换行

CSS 必须支持长句自动换行。

要求：

1. 多行高亮视图自动换行；
2. 表格单元格自动换行；
3. 删除标记可以随文本换行；
4. 插入标记可以随文本换行；
5. 页面不能因为长句横向撑破。

建议样式：

```css
.sentence-line {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.8;
}

.diff-table td,
.diff-table th {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  vertical-align: top;
}

.highlight-span {
  display: inline;
  padding: 2px 4px;
  border-radius: 4px;
}
```

不要将高亮片段设置为 `inline-block`。

---

## 8. 当前样本展示一致性

必须保证：

1. 主编辑组表格只能来自当前样本的 `edit_groups`；
2. 当前样本没有的编辑片段不能出现在表格中；
3. 删除/插入说明示例不能混入当前样本表格；
4. 切换样本后必须清空旧样本展示；
5. 如果当前样本没有删除操作，主表格中不应出现删除行；
6. 如果当前样本没有插入操作，主表格中不应出现插入行；
7. JSON 预览必须与当前样本一致；
8. `HighlightView` 必须基于 `render_lines` 渲染；
9. 禁止在完整句子中搜索 `edit_group.items[target_id].text` 来定位高亮。

---

## 9. 组件要求

### 9.1 ManualInputPanel

功能：

1. 原句输入框；
2. 参考答案动态输入列表；
3. 候选句动态输入列表；
4. 添加参考答案；
5. 删除参考答案；
6. 添加候选句；
7. 删除候选句；
8. 生成对齐结果；
9. 清空输入；
10. 输入校验；
11. 保留非空输入框的原始文本，不自动 trim。

### 9.2 JsonUploadPanel

功能：

1. 上传 JSON 文件；
2. 解析 JSON；
3. 校验格式；
4. 处理单样本 JSON；
5. 处理多样本 JSON 数组；
6. 处理重复 candidate id；
7. 忽略空 reference；
8. 保留空 candidate text；
9. 成功后更新 samples；
10. 文件超过 10MB 时给出性能提示；
11. 失败时显示错误信息。

### 9.3 SampleNavigator

功能：

1. 显示当前样本 id；
2. 上一条；
3. 下一条；
4. 下拉选择样本；
5. 切换样本时触发当前样本重新计算和渲染；
6. 不全量批处理所有样本。

### 9.4 EditGroupTable

功能：

1. 渲染 `edit_groups`；
2. 每行一个 `edit_group`；
3. 每列一个 target；
4. 支持替换、删除、插入、equal 展示；
5. 纯插入 group 的原句侧和未插入 target 显示 `/\`；
6. 长文本自动换行；
7. 点击行可与高亮视图联动；
8. 如果没有 references，不显示 reference 列。

### 9.5 HighlightView

功能：

1. 使用 `render_lines` 渲染；
2. 渲染原句；
3. 渲染所有参考答案；
4. 渲染所有候选句；
5. 根据 segment 添加高亮；
6. 支持删除占位符；
7. 支持插入标记；
8. 长句自动换行；
9. 鼠标悬停显示编辑信息；
10. 不通过字符串搜索定位高亮。

### 9.6 JsonPreview

功能：

1. 显示当前样本的输出 JSON；
2. 输出 JSON 包含 `targets`、`edit_groups` 和 `render_lines`；
3. 支持自动换行或横向滚动；
4. 内容必须与当前样本一致。

---

## 10. 验收样例

### 样例 1：普通替换与多候选差异

输入：

```text
source = 他对这个问题感到很有兴趣。

references:
他对这个问题很感兴趣。
他对这个问题很有兴趣。

candidates:
他对这个问题很感兴趣。
他对这个问题非常感兴趣。
他对这个题目很感兴趣。
```

期望主表格只包含两个主要 `edit_group`：

| 原句片段 | ref_1 | ref_2 | candidate_1 | candidate_2 | candidate_3 |
|---|---|---|---|---|---|
| 问题 | 问题 | 问题 | 问题 | 问题 | 题目 |
| 感到很有兴趣 | 很感兴趣 | 很有兴趣 | 很感兴趣 | 非常感兴趣 | 很感兴趣 |

不能混入“好的，”等其他示例内容。

### 样例 2：删除

输入：

```text
source = 好的，我明天去学校。
candidate = 我明天去学校。
```

期望：

1. 删除内容“好的，”显示为红色 `[好的，]`；
2. 删除文字使用 CSS 原生删除线；
3. 候选句中也显示删除占位符；
4. 不显示成 `[\]好的，`；
5. 不显示成 `[好的，\]`。

### 样例 3：插入

输入：

```text
source = 我昨天去学校。
candidate = 我昨天去了学校。
```

期望：

```text
原句：      我昨天去/\学校。
candidate：我昨天去/了\学校。
```

要求：

1. 原句侧不显示“插入点”；
2. 原句侧只显示 `/\`；
3. 候选句侧显示 `/了\`；
4. 原句侧和候选句侧插入标记颜色一致。

### 样例 4：无修改

输入：

```text
source = 我昨天去了学校。
candidate = 我昨天去了学校。
```

期望显示：

```text
该样本没有检测到修改。
```

### 样例 5：全句删除

JSON 输入：

```json
{
  "id": "sample_delete_all",
  "source": "我昨天去了学校。",
  "references": [],
  "candidates": [
    {
      "id": "model_a",
      "text": ""
    }
  ]
}
```

期望表格：

| 原句片段 | model_a |
|---|---|
| 我昨天去了学校。 | [我昨天去了学校。] |

### 样例 6：句首插入

输入：

```text
source = 我昨天去学校。
candidate = 其实我昨天去学校。
```

期望：

```text
原句：      /\我昨天去学校。
candidate：/其实\我昨天去学校。
```

### 样例 7：句尾插入

输入：

```text
source = 我昨天去学校。
candidate = 我昨天去学校了。
```

期望：

```text
原句：      我昨天去学校/\
candidate：我昨天去学校/了\
```

### 样例 8：调序

输入：

```text
source = 我把作业昨天写完了。
candidate = 我昨天把作业写完了。
```

期望：

1. 不识别 move；
2. 不识别 reorder；
3. 统一作为 replace 展示：

```text
把作业昨天 → 昨天把作业
```

### 样例 9：空格删除

输入：

```text
source = 我 喜欢学习。
candidate = 我喜欢学习。
```

期望：

1. 不要自动 trim 句中空格；
2. 删除显示为包含原始空格的 `[ ]`，并使用删除线和红色背景辅助识别。

### 样例 10：重复 candidate id

JSON 输入：

```json
{
  "id": "sample_dup",
  "source": "我昨天去学校。",
  "references": [],
  "candidates": [
    {
      "id": "model_a",
      "text": "我昨天去了学校。"
    },
    {
      "id": "model_a",
      "text": "我昨天去过学校。"
    }
  ]
}
```

期望候选 id 自动变为：

```text
model_a
model_a_2
```

表格列不能互相覆盖。

### 样例 11：重叠 span 表格文本

输入：

```text
source = 他对这个问题感到很有兴趣。
candidate = 他对这个问题很有兴趣。
```

期望：

| 原句片段 | candidate |
|---|---|
| 感到很有兴趣 | 很有兴趣 |

不能显示为空，也不能只显示局部 edit 的空字符串。

### 样例 12：纯插入但某个候选未插入

输入：

```text
source = 我昨天去学校。
ref_1 = 我昨天去了学校。
candidate_1 = 我昨天去学校。
```

期望表格：

| 原句片段 | ref_1 | candidate_1 |
|---|---|---|
| /\ | /了\ | /\ |

### 样例 13：句首空格删除

输入：

```text
source = " 我喜欢学习。"
candidate = "我喜欢学习。"
```

期望：

1. 不要自动 trim source；
2. 句首空格保留为原始空格；
3. 删除显示为包含原始空格的 `[ ]`，并使用删除线和红色背景辅助识别。

### 样例 14：无参考答案

输入：

```text
source = 我昨天去学校。
references = []
candidates = [
  我昨天去了学校。
]
```

期望：

1. 表格不显示 `ref_1` 列；
2. 只显示 `candidate_1` 列。

### 样例 15：JSON references 空字符串

输入：

```json
{
  "source": "我昨天去学校。",
  "references": ["", "我昨天去了学校。"],
  "candidates": [
    {
      "id": "model_a",
      "text": "我昨天去了学校。"
    }
  ]
}
```

期望：

1. 空 reference 被忽略；
2. 只生成一个有效参考答案 `ref_1`；
3. candidate 正常展示。

---

## 11. 完成标准

任务完成后应满足：

1. `npm install` 可以安装依赖；
2. `npm run test` 可以运行 Vitest 单元测试；
3. `npm run build` 可以完成 TypeScript 和 Vite 构建；
4. `npm run dev` 可以启动页面；
5. 手动输入可以生成对齐结果；
6. JSON 上传可以解析单样本；
7. JSON 上传可以解析多样本数组；
8. 多样本可以切换；
9. 上传多样本 JSON 后不全量批处理；
10. 编辑组表格正确展示；
11. 多行高亮视图基于 `render_lines` 正确展示；
12. 删除显示为 `[被删除内容]`，并使用 CSS 原生删除线；
13. 插入显示为原句侧 `/\`、目标句侧 `/插入内容\`；
14. 长句不会横向撑破页面；
15. 无修改样本显示提示；
16. 当前样本表格不会混入其他样例内容；
17. JSON 格式错误时页面不崩溃，并显示错误信息；
18. 调序统一作为 `replace` 展示；
19. 句首、句尾、句中空格不会被自动 trim 掉；
20. 纯插入 group 不显示为空白；
21. `README.md` 内容真实可行，说明安装、启动、测试、构建、JSON 格式和主要使用流程；
22. `test-cases/gec-alignment-cases.json` 包含覆盖各种情况的测试用例；
23. 项目完成后上传到 GitHub 仓库 [chenqingyu24/GEC_Annotation](https://github.com/chenqingyu24/GEC_Annotation)。

---

## 12. 实现注意事项

1. 主表格必须完全由当前样本的 `edit_groups` 渲染；
2. 多行高亮必须由当前样本的 `render_lines` 渲染；
3. 删除/插入说明示例不要硬编码到主表格中；
4. 手动输入中的空候选句要忽略；
5. JSON 中 `text: ""` 要视为有效候选句；
6. JSON 中空 reference 要忽略；
7. `source` 为空时要报错；
8. `candidates` 为空时要报错；
9. 高亮片段不要使用 `inline-block`；
10. 删除文字使用 CSS 原生删除线，不使用斜线覆盖；
11. 插入内容必须放在 `/` 和 `\` 中间；
12. 切换样本时要重新计算并渲染所有结果；
13. 使用 `Array.from` 处理字符索引；
14. 不要在 `HighlightView` 中通过字符串搜索定位高亮位置；
15. 文件超过 10MB 时给出性能提示；
16. 不要上传后循环构建所有样本的 diff view；
17. 不实现 `visualizeInvisible`，不把空格、制表符、换行符替换成特殊可视化符号；
18. 完成实现后必须补充 README、测试用例文件和 Vitest 单元测试；
19. 上传 GitHub 前应先运行 `npm run test` 和 `npm run build`。

---

## 13. 已确认实现决策与交付补充

### 13.1 已确认实现决策

1. LCS diff 使用 TypeScript 字符级实现，`charDiff` 保持确定性基础 diff，展示优化放到后处理；
2. LCS 回溯 tie-break 固定为：字符相等走 equal，上方更优走 delete，左方更优走 insert，上方和左方相等时优先 delete；
3. 短距离 delete + insert 在满足 `mergeNearbyEdits` 条件时合并为 `replace`，用于稳定展示短调序；
4. 不新增 `move` 或 `reorder` 类型；
5. `EditGroupItem` 扩展 `segments`，用于保留 group 内部细粒度变化；
6. 纯插入 group 中未插入的 target 使用 `anchor` op，展示为 `/\`；
7. 所有 target id 必须全局唯一，candidate id 冲突时自动后缀化；
8. JSON 中只把严格空字符串 `""` 当空，空白字符串如 `"   "` 必须保留；
9. 多样本 JSON 中任一样本非法时整文件拒绝导入；
10. `render_lines` 中 source 行和 target 行都使用统一 diff 标记；
11. 不做 `␠`、`⇥`、`↵` 等不可见字符替换；
12. 删除使用 CSS 原生 `line-through`，不做旋转斜线覆盖；
13. 单个 source-target 的 LCS 计算量超过 `2_000_000` 时拒绝对当前样本执行 diff；
14. 核心算法必须配套 Vitest 单元测试。

### 13.2 README 要求

项目根目录必须包含 `README.md`。

README 内容必须真实可行，至少包含：

1. 项目简介；
2. 环境要求；
3. 安装命令：`npm install`；
4. 启动命令：`npm run dev`；
5. 测试命令：`npm run test`；
6. 构建命令：`npm run build`；
7. 手动输入使用说明；
8. JSON 上传格式说明；
9. 多样本切换说明；
10. 主要限制说明，包括 10MB 文件提示、3000 样本建议和 LCS 计算量上限。

README 不能写未实现功能，不能写无法执行的命令。

### 13.3 测试用例文件要求

项目根目录必须包含：

```text
test-cases/gec-alignment-cases.json
```

该文件需要包含各种输入情况，至少覆盖：

1. 普通替换；
2. 删除；
3. 插入；
4. 无修改；
5. 全句删除；
6. 句首插入；
7. 句尾插入；
8. 短距离调序；
9. 空格删除且不 trim；
10. 重复 candidate id；
11. candidate id 与 reference id 冲突；
12. 重叠 span 的 group 文本计算；
13. 纯插入但某个 target 未插入，使用 `anchor`；
14. 句首空格删除；
15. 无参考答案；
16. JSON references 空字符串忽略；
17. JSON 空白字符串保留；
18. 多样本 JSON；
19. 非法 JSON 或非法样本；
20. 超过 LCS 计算量上限的样本。

Vitest 单元测试可以直接引用该测试用例文件，也可以在测试中内联构造数据；但该文件必须存在，便于人工验收和后续扩展。

### 13.4 GitHub 交付要求

项目完成并通过验证后，需要上传到 GitHub 仓库：

[chenqingyu24/GEC_Annotation](https://github.com/chenqingyu24/GEC_Annotation)

上传前必须确认：

1. `npm install` 可安装依赖；
2. `npm run test` 通过；
3. `npm run build` 通过；
4. `README.md` 已更新；
5. `test-cases/gec-alignment-cases.json` 已提交；
6. 不提交无关临时文件、构建产物或本地环境文件。

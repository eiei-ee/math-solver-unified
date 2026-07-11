# 两个源仓的全量代码探索

本报告记录融合前对两个 GitHub 仓库的逐文件审查。结论以指定提交为准，不把 `node_modules`、构建产物、`.git`、缓存或二进制课程文档算作运行时代码。

## 审查范围

### `eiei-ee/math-solver`

- 提交：`1484144bbaedaaf2418874c32792f3b728158b63`
- 检查全部 21 个 `src` 文件，约 1,440 行。
- 检查 `.gitignore`、`package.json`、Electron/Vite/Builder 配置、3 个 tsconfig、Tailwind/PostCSS、README 和 PRODUCT。
- 原仓两套 `tsc --noEmit` 均通过。
- 排除 `node_modules`、`dist`、`out` 和 4 个课程 `.docx`。

### `eiei-ee/math-solver-rag`

- 提交：`b143fa4e5db9d2670bdc3f0f63b011920c8741f8`
- 检查全部 28 个 tracked 文件，共约 1,433 行：10 个 Python/包文件、15 个 Markdown、3 个配置/元数据文件。
- 10 个 Python 文件均通过 AST 语法解析。
- 排除 `.git` 和运行时缓存；审查环境未安装 Gradio，因此没有把“能 import”误报为真实启动通过。

## `math-solver`：结构与调用链

| 文件 | 职责 |
|---|---|
| `src/main/index.ts` | BrowserWindow、开发/生产入口、应用生命周期、外部链接 |
| `src/main/ipc.ts` | 设置 JSON、文件对话框、模型请求、AbortController、SSE 转发 |
| `src/preload/index.ts` | `contextBridge`，设置/文件/聊天 IPC |
| `src/shared/providers.ts` | 9 家 Provider、模型能力、请求体与流片段解析 |
| `src/renderer/App.tsx` | 顶部栏、输入/答案双栏、设置弹窗 |
| `renderer/api/*` | payload、Provider 重导出和 Renderer 类型 |
| `renderer/store/chat.ts` | 消息、loading/error、输入 Tab、图片 |
| `renderer/store/settings.ts` | Provider、Key、模型的加载与保存 |
| `renderer/hooks/useChatSubmit.ts` | 三输入统一提交、IPC 监听和状态收尾 |
| `TextTab.tsx` | 文字题与 Ctrl/Cmd+Enter |
| `ImageTab.tsx` | 拖放/选图、Canvas 压缩、视觉模型校验 |
| `LatexTab.tsx` | LaTeX 输入和 KaTeX 即时预览 |
| `AnswerPanel.tsx` | 流式答案、Markdown/KaTeX、复制、导出、取消、重生成、清空 |

原始主链路：

```text
TextTab / ImageTab / LatexTab
→ useChatSubmit
→ preload ipcRenderer.invoke(chat:send)
→ main streamChat
→ ProviderConfig.buildBody
→ fetch + SSE
→ chat:chunk / done / error
→ Zustand appendAssistant
→ ReactMarkdown + KaTeX
```

### 实际可见功能

- 文本、图片、LaTeX 三 Tab。
- 图片最长边压至 2048；PNG 保持 PNG，其他格式通常转为 JPEG。
- DeepSeek、OpenAI、Qwen、GLM、Moonshot、Gemini、Grok、Mistral、Claude。
- Gemini/Claude 原生多模态格式；其他厂商走 OpenAI-compatible。
- 多轮历史、流式增量、60 秒超时、显式停止。
- Markdown + KaTeX、复制最新答案、导出整段 Markdown、重生成和清空。
- 设置持久化；聊天本身不持久化。

README 声称的“本地模型”在代码中并不存在：endpoint 和模型都来自固定远程 Provider，Ollama 同时又被列为未来功能。

### 原仓主要缺陷

1. `LatexTab.tsx` 把普通文本直接拼入 `innerHTML`，形成 Renderer XSS；preload 又能读取完整 Key，使影响被放大。
2. BrowserWindow 显式 `sandbox:false`，没有 `will-navigate` 或 CSP；Markdown 链接可能把同一窗口导航到远程页。
3. API Key 明文写入 `userData/settings.json`，完整返回 Renderer，并在每个聊天 payload 中再传回 Main。
4. 当前 `imageBase64` 会附到所有历史 user 消息；chat store 又忽略图片参数，导致图片错绑、后续丢失和重生成无图。
5. Windows 路径用未经 URL 转换的 `fetch(file://${path})` 读取；中文、空格和反斜杠路径不可靠。
6. chunk/done/error 是窗口级字符串广播，没有 `requestId`；扩展 RAG 状态后很容易串流。
7. SSE 只按行处理、不解析尾 buffer；固定总时限不会因持续收到流数据而续期。
8. Renderer/Main/Store 各自定义 ChatMessage，加入附件和引用后会继续分叉。
9. 历史、图片和 RAG 上下文均无 token/大小预算。
10. 没有测试、lint、CI 或显式 typecheck 脚本；`build` 不先做严格类型检查。

## `math-solver-rag`：结构与调用链

| 文件 | 职责 |
|---|---|
| `.env.example` | DeepSeek Key、模型和 Provider 示例 |
| `config.py` | dotenv + `Settings`（Provider、Key、模型、温度、token、RAG） |
| `providers.py` | 7 家 OpenAI-compatible Provider |
| `prompts.py` | 文本/图片/LaTeX COSTAR、负向提示、RAG 拼接 |
| `llm.py` | ChatOpenAI 创建、历史转换、RAG、流式生成和错误中文化 |
| `app.py` | Gradio Blocks/ChatInterface 与启动入口 |
| `desktop_app.py` | 后台 Gradio + pywebview 窗口 |
| `rag/loader.py` | 递归 Markdown 加载、500/50 切分 |
| `rag/retriever.py` | char_wb 1–3 gram TF-IDF、余弦 Top-5、pickle/npz 缓存 |
| `ui/__init__.py` | 空占位包；实际 UI 不在此目录 |
| `rag/__init__.py` | 空包初始化 |
| `docs/prompt_comparison.md` | 人工 Prompt 对比说明 |

知识库 14 篇、约 18.6KB/633 行：

- `algebra.md`：方程、不等式、指数对数、数列。
- `analytic_geometry.md`：直线与圆锥曲线。
- `calculus.md`：极限、导数、积分。
- `geometry.md`：平面几何。
- `linear_algebra.md`：矩阵、行列式、方程组、特征值。
- `methods.md`：通用解题方法与误区。
- `probability.md`：概率、随机变量、分布和统计。
- `trigonometry.md`：三角公式与解三角形。
- `vector_3d.md`：向量、空间直线/平面和体积。
- `exam_problems/problem_01.md`–`problem_05.md`：5 道自称高考/考研真题的示例题。

原始 RAG 链路：

```text
app.py import
→ init_index()
→ 有缓存则 pickle/load_npz
→ 否则 DirectoryLoader
→ RecursiveCharacterTextSplitter(500, 50)
→ TfidfVectorizer(char_wb, 1–3, max_features=5000)

Gradio chat_fn
→ stream_chat(message, history, settings, use_rag)
→ retrieve_context(message, k=5)
→ build_full_prompt(input_type, context)
→ ChatOpenAI.stream
→ 每次 yield 累计全文
```

### 实际可见功能

- Gradio 文本聊天、多轮与流式显示。
- Provider/模型/Key、温度和 RAG 开关。
- COSTAR、负向提示、LaTeX 渲染、示例题和帮助说明。
- Web 入口固定 `127.0.0.1:7860`；另有 pywebview 桌面入口。

图片 Prompt、LaTeX Prompt 和 Qwen-VL 虽存在，但 UI 无图片上传，`app.py` 也从不传 `input_type`，因此这些分支实际上不可达。

### 原仓主要缺陷

1. `desktop_app.py` import `webview`，但 `requirements.txt` 没有 `pywebview`，桌面入口无法由依赖清单完整安装。
2. 所有 Python 依赖只有 `>=` 下限，没有 lock；Gradio/LangChain 接口可能漂移。
3. `Chatbot` 没有显式声明 messages 类型，`llm.py` 却假定 history 是 `{role, content}` 字典。
4. 启动时无异常保护地同步建索引，失败会阻止应用启动。
5. 直接 `pickle.load` 可写缓存，存在本地任意代码执行风险。
6. 缓存只判断三个文件存在，不比较知识 hash、mtime、索引版本或依赖版本；内容变更后仍加载旧索引。
7. 所有 Provider 共用一个 Key；切换厂商不清空 Key，可能把 DeepSeek Key 发给其他 endpoint。
8. 未知 Provider 静默回退 DeepSeek endpoint，而不是拒绝无效配置。
9. 检索只看当前短消息，不做查询改写、历史补全、最低阈值、rerank 或 token 预算。
10. 检索异常文本被塞回 system prompt，而不是作为独立降级状态。
11. Gradio 生成器 yield 累计全文；若直接接到 Electron 的 delta 追加，会重复答案。
12. 对比文档宣称检索到“点差法”，但该内容不在被 ingestion 的知识目录中。
13. 5 个“真题”文件没有年份、出处或许可；两个仓库也都没有 LICENSE。

知识内容还发现若干需审校的数学表述，详见 `provenance.md`。

## 功能矩阵与融合选择

| 能力 | `math-solver` | `math-solver-rag` | 新仓选择 |
|---|---|---|---|
| 桌面壳 | Electron + Windows 打包 | Gradio + 未完整声明的 pywebview | Electron |
| 三输入 | 真正可用 | 图片/LaTeX Prompt 不可达 | React 三 Tab |
| Provider | 9 家，含 Gemini/Claude/视觉 | 7 家，强制 ChatOpenAI-compatible | TypeScript Provider 层 |
| 流式协议 | delta + IPC | 累计全文 Generator | delta + `requestId` 事件 |
| RAG | 无 | 本地 TF-IDF | TypeScript 内存 TF-IDF |
| Prompt | 单一静态文本 | COSTAR + negative + RAG | 按输入类型动态构建 |
| 温度 | UI 无 | 有 | 持久化滑块 |
| 来源透明度 | 无 | 只把文件名塞进字符串 | 结构化 `RagHit[]` 卡片 |
| 凭据 | 明文且暴露 Renderer | 会话字段且可跨厂商误传 | Main-only + safeStorage |
| 测试 | 无 | 无 | 11 个确定性单元测试 + 双 tsconfig |

## 为什么不直接合并 Python

原样合并会要求用户同时安装 Node、Python、Gradio、pywebview、LangChain、NumPy、SciPy 和 scikit-learn，并维护两个 UI、两个 Provider 注册表和两种流协议。当前语料只有约 18.6KB，纯 TypeScript 内存索引足够，更易打包、测试和升级。

因此新仓迁移的是 RAG 的行为与资料，不是把两个顶层目录机械拼在一起。

## 融合后验证

- `npm test`：11/11 单元测试通过。
- `tsc --noEmit -p tsconfig.node.json`：通过。
- `tsc --noEmit -p tsconfig.web.json`：通过。
- `electron-vite build`：最终代码的主进程、preload、renderer 三包生产构建通过。
- 静态生产界面在默认窗口和 Electron 最小窗口 `900×600` 下完成 DOM 与截图检查；设置对话框无溢出。

没有调用真实第三方模型 API，因此不会把测试题、知识片段或用户密钥发送给外部服务。

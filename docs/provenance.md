# 来源与迁移说明

## 源代码快照

| 来源 | 提交 | 在融合仓中的用途 |
|---|---|---|
| `eiei-ee/math-solver` | `1484144bbaedaaf2418874c32792f3b728158b63` | Electron/React 基线、三种输入、多 Provider、SSE、答案操作 |
| `eiei-ee/math-solver-rag` | `b143fa4e5db9d2670bdc3f0f63b011920c8741f8` | 知识资料、COSTAR/负向提示、TF-IDF 行为与 RAG 设置 |

## 迁移映射

### 保留并改造

- `math-solver/src/renderer/**` → `src/renderer/**`
  - 保留双栏桌面工作流。
  - 增加 RAG 状态、来源条目、温度与图片关键词。
  - 修复 LaTeX 普通文本未转义、Windows 图片路径读取和图片历史丢失。
- `math-solver/src/shared/providers.ts` → `src/shared/providerCatalog.ts` + `src/shared/providers.ts`
  - 将 Renderer 可见的模型元数据与 Main-only 密钥/请求逻辑分离。
- `math-solver/src/main/ipc.ts` → `src/main/ipc.ts`、`settings.ts`、`sse.ts`、`messageMapper.ts`
  - 使用共享协议、`requestId`、运行时校验、流空闲超时和安全凭据存储。
- `math-solver-rag/prompts.py` → `src/shared/prompts.ts`
  - 保留 COSTAR、三输入类型和负向约束的意图，调整为更明确的 RAG 信任边界。
- `math-solver-rag/rag/loader.py` + `retriever.py` → `src/main/rag.ts` + `ragCore.ts`
  - 保留 Markdown、500/50 切分、字符 1–3 gram、TF-IDF、余弦 Top-5。
  - 不保留 pickle/npz 缓存，改为小语料内存索引。
- `math-solver-rag/rag/knowledge/*.md` → `resources/knowledge/*.md`
  - 导入通用数学资料，供本地检索。

### 不合并

- `app.py`、`desktop_app.py`、`ui/`：与 Electron UI 重复。
- `llm.py`、Python `providers.py`、`config.py`：会限制 Gemini/Claude 和多模态协议。
- `requirements.txt`、LangChain、Gradio、pywebview、NumPy/SciPy/scikit-learn：18KB 级语料不值得引入第二运行时。
- `.cache/*.pkl`、`.npz`：不安全、版本敏感且没有知识内容失效机制。
- 主仓课程任务书、评分表、课程报告与链接集合：不是产品运行时资产。
- `exam_problems/problem_01.md` 至 `problem_05.md`：标注为高考/考研真题，但没有年份、出处或再分发授权；融合仓在公开前不包含这些文本。

## 许可状态

两个源提交都没有 `LICENSE`、`COPYING` 或 `NOTICE`。公开可读不等于获得开源再分发许可。本仓当前也不声明开源许可证，默认保留全部权利。

远程公开前，仓库权利人应：

1. 明确选择许可证并确认自己有权许可两个源仓代码。
2. 审查知识文档的作者、引用和数学内容。
3. 若重新加入考试题，记录年份、地区/考试、题号、来源链接和许可依据，或改用自编题。

## 内容质量提醒

源 RAG 文档仍需数学审校。全量探索发现的代表性问题包括：

- 均值不等式的使用条件表述不完整。
- 部分导数结论将充分条件写得近似必要条件。
- 齐次方程组的行列式结论遗漏方阵前提。
- 解析几何个别示例用有限斜率参数化，却把垂线情形仅描述为极限。

这些资料只能作为辅助参考，不能替代可靠教材、教师或正式答案。

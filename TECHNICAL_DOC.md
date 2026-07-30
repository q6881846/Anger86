# mowen-vite 技术文档（修正版）

> 本文档基于审阅反馈修正了 4 项硬性矛盾，并落实了 5 项优化建议。

---

## 一、技术栈

### 前端
| 依赖 | 版本 | 用途 |
|------|------|------|
| Vite | 5.4.x | 构建工具 + Dev Server (端口 3002) |
| React | 18.3.x | UI 框架 |
| TypeScript | 5.5.x | 类型安全 |
| @vitejs/plugin-react-swc | - | SWC 编译加速 |
| Tailwind CSS | 3.4.17 | 原子化样式 |
| React Router | v6 | 路由 |
| Zustand | 4.5.4 | 全局状态管理（含 persist 中间件） |
| @tanstack/react-query | 5.x | 20 步流水线 API 封装（mutation + 缓存） |
| idb-keyval | - | IndexedDB 简易封装（大文本存储） |
| mammoth | 1.7.2 | **浏览器端 .docx 文件解析**（`mammoth.extractRawText()`） |

### 后端
| 依赖 | 版本 | 用途 |
|------|------|------|
| Express | 4.x | Prompt Template Service (端口 3456) |
| dotenv | 16.x | `.env` 文件环境变量加载 |
| Node.js | 18+ | 原生 `fetch` 调用 LLM API |

### 开发工具
| 依赖 | 版本 | 用途 |
|------|------|------|
| ESLint | 8.x | 代码规范（0 errors, 0 warnings） |
| Prettier | ^3.3.3 | 代码格式化 |
| @types/node | - | Node.js 类型定义 |
| rollup-plugin-visualizer | ^5.12.0 | 构建产物体积分析 |

---

## 二、架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器（前端）                         │
│                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐ │
│  │ React UI │  │ Zustand   │  │ TanStack Query       │ │
│  │ (路由/页 │  │ (流程状态  │  │ (mutation 封装       │ │
│  │  面/组件)│  │  + 轻量变 │  │  20步API/重试/缓存)  │ │
│  │          │  │  量)      │  │                      │ │
│  └────┬─────┘  └─────┬─────┘  └──────────┬───────────┘ │
│       │              │                    │             │
│       │      ┌───────┴────────────────────┘             │
│       │      │  Vite Dev Proxy                           │
│       │      │  /api/* → http://localhost:3456/api/*     │
│       │      │  (无 rewrite，后端路由统一 /api 前缀)      │
│       └──────┤                                            │
│              │                                            │
│  ┌───────────┴──────────────────────────────────────┐   │
│  │           浏览器存储层                             │   │
│  │  ┌──────────────────────┐  ┌─────────────────┐   │   │
│  │  │ IndexedDB (idb-keyval)│  │ localStorage    │   │   │
│  │  │ ← 步骤输出/大文本     │  │ ← Zustand persist│   │   │
│  │  │   (20步流水线产物)    │  │   (API配置/项目  │   │   │
│  │  │   Key: project::pid  │  │    元数据降级)   │   │   │
│  │  │     ::step::sid      │  │                  │   │   │
│  │  └──────────────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP / SSE
┌─────────────────────────┴───────────────────────────────┐
│              Express Prompt Service (:3456)              │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ /api/prompts│  │/api/genesis/ │  │/api/genesis/   │ │
│  │ (模板管理)   │  │  step        │  │  stream (SSE)  │ │
│  │             │  │ (非流式LLM)  │  │ (流式LLM)      │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                  │           │
│  ┌──────┴──────┐  ┌──────┴──────────────────┘           │
│  │prompt-      │  │ LLM API 调用                        │
│  │templates.json│  │ (OpenAI 兼容 / LongCat 等)          │
│  │(20套模板)    │  │                                    │
│  └─────────────┘  └────────────────────────────────────│
│                                                         │
│  环境变量: dotenv 加载 server/.env                       │
│  LLM_API_KEY / LLM_BASE_URL / LLM_MODEL / PROMPT_PORT   │
└─────────────────────────────────────────────────────────┘
```

### Proxy 路径映射说明

**Vite proxy 配置**（`vite.config.ts`）:

```typescript
proxy: {
  // 后端 Express 所有路由均以 /api 开头，无需 rewrite
  // 前端 /api/health → 后端 http://localhost:3456/api/health
  '/api': {
    target: 'http://localhost:3456',
    changeOrigin: true,
  },
}
```

后端 Express **所有路由统一以 `/api` 前缀挂载**：
- `GET  /api/health` — 健康检查
- `GET  /api/prompts` — 列出全部模板
- `POST /api/prompts/:key` — 填充模板变量
- `GET  /api/prompts/:key/raw` — 获取原始模板
- `POST /api/genesis/step` — 非流式 LLM 调用
- `POST /api/genesis/stream` — SSE 流式 LLM 调用

前端请求 `/api/health` 经 Vite proxy 代理到 `http://localhost:3456/api/health`，路径完全匹配，无 404 风险。**未使用 `rewrite`**，因为后端路由已统一前缀。

---

## 三、文件解析方案（修正口径）

### 前端运行时：mammoth.js

用户上传的 `.docx` 附件由**前端** `src/lib/parser.ts` 使用 mammoth.js 解析：

```typescript
import mammoth from 'mammoth';

export async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
```

支持流程：用户在附件面板拖入 `.docx` → `parseDocx()` 提取纯文本 → `autoSplit()` 按段落拆分为 `ExtractedChunk[]` → 绑定到 Prompt 变量。

### 后端初始化：Python 一次性脚本（非运行时）

Python `zipfile + 正则` 仅用于项目初始化阶段，从原始 docx 文档中一次性提取 26 个变量和 20 套 Prompt 模板，写入 `server/prompt-templates.json`。**这是离线脚本，不参与运行时文件解析。**

---

## 四、环境变量配置（跨平台）

### 方式一：.env 文件（推荐）

在 `server/` 目录下创建 `.env` 文件（参考 `server/.env.example`）：

```bash
# server/.env
LLM_API_KEY=your-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
PROMPT_PORT=3456
```

后端通过 `import 'dotenv/config'` 自动加载。

### 方式二：操作系统环境变量

| 平台 | 命令 |
|------|------|
| Windows (CMD) | `set LLM_API_KEY=your-key-here` |
| Windows (PowerShell) | `$env:LLM_API_KEY="your-key-here"` |
| macOS / Linux | `export LLM_API_KEY=your-key-here` |

`.env` 文件已在 `.gitignore` 中忽略，不会提交到版本控制。

---

## 五、构建产物分析

### 当前产物体积

| 文件 | 大小 | gzip | brotli |
|------|------|------|--------|
| `dist/index.html` | 1.06 kB | 0.72 kB | - |
| `dist/assets/index-*.css` | 8.35 kB | 2.49 kB | - |
| `dist/assets/index-*.js` | 271.21 kB | 88.38 kB | - |

### 产物可视化

已集成 `rollup-plugin-visualizer`，每次 `npm run build` 生成 `dist/stats.html`，可用浏览器打开查看各模块体积占比。

---

## 六、异常处理与降级策略

### LLM 接口异常

| 场景 | 处理方式 |
|------|----------|
| API 超时/网络错误 | TanStack Query `mutation` 默认 `retry: 1`，失败后 `onError` 回调写入 Zustand `stepError` |
| API 限流 (429) | 后端返回错误信息，前端展示错误提示，用户可手动重试 |
| API Key 缺失 | 后端返回 400 + 错误信息 `"No API key configured"` |
| LLM 返回非预期格式 | 后端解析 `choices[0].message.content`，为空时返回空字符串 |

### SSE 流式中断

| 场景 | 处理方式 |
|------|----------|
| 流式过程中网络断开 | `reader.read()` 抛出异常 → `onError` 回调 → 已接收的 `streamBuffer` 保留在 Zustand 中 |
| 后端解析 LLM SSE 失败 | `catch` 块忽略解析失败的行，继续处理后续数据 |
| 后端 LLM 调用失败 | 后端通过 SSE 发送 `{ error: message }` + `[DONE]`，前端 `onError` 触发 |

### IndexedDB 存储异常

| 场景 | 处理方式 |
|------|----------|
| 存储空间不足 | `idb-keyval` 的 `set()` 抛出异常 → 前端 catch 后提示用户清理旧数据 |
| 浏览器不支持 IndexedDB | Zustand persist 中间件自动降级到 `localStorage` |
| 大文件写入（>2M 字符） | 前端展示警告提示，建议用户拆分内容 |

### 步骤状态恢复

每步执行结果存入 IndexedDB（Key: `project::${pid}::step::${sid}`），页面刷新后通过 `loadStepOutputs(pid)` 重新加载。Zustand store 的 `persist` 中间件保存流程状态（currentStep、stepStatus 等）到 `localStorage`，实现刷新后恢复。

---

## 七、代码规范

### ESLint

- 配置文件：`.eslintrc.json`
- 忽略目录：`dist/`、`server/`、`node_modules/`
- 当前状态：**0 errors, 0 warnings**
- `@typescript-eslint/no-unused-vars` 规则启用

### Prettier

- 配置文件：`.prettierrc`
- 版本：`^3.3.3`

### 废弃模块治理

已废弃的 `promptStore.ts` 和 `default-prompts.ts` 已从代码库中删除。Prompt 模板完全由后端 `server/prompt-templates.json` 管理，前端通过 `/api/prompts` 接口获取。

---

## 八、启动方式

```bash
# 1. 启动后端 Prompt Service
cd server
cp .env.example .env    # 首次使用：复制并填入 LLM_API_KEY
npm install
npm start               # → http://localhost:3456

# 2. 启动前端 Dev Server
cd ..
npm install
npm run dev             # → http://localhost:3002
```

### 验证

```bash
# 健康检查
curl http://localhost:3002/api/health
# → {"status":"ok","templates":20}

# 构建检查
npm run build           # → dist/ + dist/stats.html

# 代码规范检查
npm run lint            # → 0 errors, 0 warnings
```

---

## 九、设计系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-bg` | `#0a0e1a` | 墨色暗黑底色 |
| `--color-gold` | `#d4a657` | 金色（主强调） |
| `--color-jade` | `#6ec092` | 玉色（成功/正向） |
| `--color-vermilion` | `#e85d68` | 朱色（错误/警示） |
| `--color-indigo` | `#7a9ef0` | 靛色（信息/链接） |
| `--color-purple` | `#b890e8` | 紫色（辅助强调） |
| `--ease-out` | `cubic-bezier(0.22,1,0.36,1)` | 标准缓动 |
| 字体 | Noto Serif SC | 衬线体（标题/正文） |

动画特效：`prefers-reduced-motion` 降级，12 个 keyframes（gradient-flow、dot-blink、fade-up、fade-down、float-up、blink-caret、scroll-dot、hero-pulse、spin、particle-rise、shimmer、pulse-soft）。

---

## 十、审阅修正记录

| 编号 | 问题 | 修正内容 |
|------|------|----------|
| 🔴 1 | mammoth vs Python 口径矛盾 | 明确区分：mammoth = 前端运行时 docx 解析；Python = 离线初始化脚本 |
| 🔴 2 | Proxy 路径映射缺失 | 补充 Vite proxy 配置说明，确认无 rewrite、后端统一 `/api` 前缀 |
| 🔴 3 | 环境变量语法平台局限 | 创建 `server/.env.example`，安装 dotenv，支持 .env 文件 + 跨平台说明 |
| 🔴 4 | Prettier 版本号存疑 | `package.json` 修正为 `^3.3.3` |
| 🟡 A | 废弃模块目录治理 | 删除 `promptStore.ts` 和 `default-prompts.ts`，清理 `Providers.tsx` 中的引用 |
| 🟡 B | 产物体积分析 | 集成 `rollup-plugin-visualizer`，每次构建生成 `dist/stats.html` |
| 🟡 C | ESLint warnings 清零 | 逐文件修复，从 14 → 0 warnings |
| 🟡 D | 架构图补充存储层 | 架构图新增"浏览器存储层"（IndexedDB + localStorage） |
| 🟡 E | 异常/降级策略说明 | 新增第六章"异常处理与降级策略" |

---

## 十一、提示词工程与交互优化（第二轮）

### 11.1 提示词模板改进（`server/prompt-templates.json`）

| 步骤 | 改进项 | 修正前 | 修正后 |
|------|--------|--------|--------|
| Step 8 | 角色数量弹性 | `严格4位` | `至少4位核心角色，如有必要可补充更多重要配角` |
| Step 10 | 节点数动态调整 | `禁止超过12个` | 按字数弹性建议（50万字 8-12 / 100万字 12-16 / 300万字 20-30） |
| Step 15 | 英文例外条款 | `禁止英文，禁止额外说明` | `禁止英文（除专有名词、ABO哨向设定名、机甲型号等必要英文缩写外）` |
| Step 16 | 正文字数下调 | `约 3000-4000 字` | `约 2500-3000 字（用户可根据平台要求调整）` |
| Step 17 | 续写字数精度 | `允许±200字浮动` | `严格控制在目标字数±10%以内` |
| 全局 | 英文禁令例外 | `不要出现英文` / `- 禁止英文` | 统一追加例外条款（专有名词、设定名、缩写等） |

### 11.2 20步回退缓存清空逻辑

**问题**：用户回退到已执行的步骤重新编辑时，下游步骤的旧缓存仍然残留，导致数据不一致。

**方案**：`jumpToStep(stepId)` 方法现在区分前进/回退：
- **前进**（`stepId > currentStep`）：仅切换 `currentStep`，不清空任何数据
- **回退**（`stepId < currentStep`）：重置 `stepId` 及其下游所有步骤的状态为 `idle`，清空 `outputRef`、`errorMsg`，同时调用 `clearDownstreamOutputs()` 清空 IndexedDB 中对应的 step output keys

**涉及文件**：
- `src/lib/store/novelGenesis.ts`：`jumpToStep` 实现重构
- `src/lib/db/stepOutputs.ts`：新增 `clearDownstreamOutputs(pid, fromStepId)`

### 11.3 编排页 Loading 骨架屏与空状态优化

**改进**：`OutputDisplay` 组件新增三种状态渲染：

| 状态 | 触发条件 | UI 表现 |
|------|----------|---------|
| **骨架屏** | `isLoading && !content` | shimmer 动画占位条（6行错落宽度）+ 顶部 spinner + 步骤色文字 |
| **空状态** | `!content && !isLoading` | 图标 pulse-soft 呼吸动画 + 引导文案 + 输出类型提示（JSON/流式/Markdown） |
| **内容展示** | `content` 存在 | 保持原有渲染逻辑 |

**新增 CSS keyframes**：
- `shimmer`：骨架屏光带扫描（200% background-position 循环）
- `pulse-soft`：空状态图标呼吸效果（opacity 0.4↔0.7）

**文件**：`src/routes/GenesisWizardPage.tsx`（OutputDisplay 组件改造）、`src/index.css`（+2 keyframes）

---

## 12. 第三轮审查：多模型适配 + 安全加固

### 12.1 后端 LLM 多模型适配层

**新增文件**：`server/lib/llm-adapter.js`

封装 `LLMAdapter` 类，统一对接 OpenAI / Anthropic / Google / Gemini / Custom 五种供应商，对外暴露统一接口：

| 方法 | 作用 |
|------|------|
| `buildRequestBody(messages, opts)` | 按供应商构造请求体（messages 格式、stream/max_tokens 字段名差异） |
| `getEndpoint(isStream)` | 返回供应商对应的 API 端点 URL |
| `getHeaders(isStream)` | 返回鉴权头（`Authorization: Bearer` vs `x-api-key`） |
| `parseResponse(raw)` | 从非流式响应中提取文本内容 |
| `parseStreamDelta(chunk)` | 从流式 SSE chunk 中提取增量文本 |

**server.js 端点改造**：

- `/api/genesis/step`（非流式）和 `/api/genesis/stream`（SSE 流式）两个端点均改为：
  - 每请求新建 `LLMAdapter` 实例，支持 `llmConfig.provider` 请求级覆盖
  - 调用 `adapter.buildRequestBody` / `getEndpoint` / `getHeaders` / `parseResponse` / `parseStreamDelta`
  - 保留原有 `safeParseJSON` / `fetchWithRetry` / SSE buffer 分行逻辑不变
- 新增环境变量 `LLM_PROVIDER`（默认 `openai`），已写入 `.env.example` 并附安全注释
- 原有 `parseLLMResponse` 函数已移除，由 `LLMAdapter.parseResponse` 替代

### 12.2 前端 API Key 防泄露检查

**新增文件**：`src/lib/security-check.ts`

| 检查维度 | 机制 | 触发时机 |
|----------|------|----------|
| **运行时环境变量扫描** | `checkEnvForKeys()` 扫描 `import.meta.env` 中所有 `VITE_` 前缀变量，匹配 OpenAI / Anthropic / Google / 百度 / GitHub PAT 密钥模式 | 开发环境 `main.tsx` 启动时 |
| **构建时源码扫描** | Vite 自定义插件 `securityScanPlugin()` 在 `transform` 阶段扫描所有 `.ts/.tsx/.js/.jsx` 源码，匹配硬编码密钥模式并发出 warn | `vite build` 构建时 |

**修改文件**：

- `src/main.tsx`：导入并调用 `runSecurityCheck()`（生产环境自动跳过，tree-shake 移除）
- `vite.config.ts`：新增 `securityScanPlugin()` 插件，`enforce: 'pre'` 在其他插件之前执行
- `server/.env.example`：新增 `LLM_PROVIDER` 配置项 + API Key 安全警告注释

### 12.3 校验结果

| 校验项 | 结果 |
|--------|------|
| `node --check server.js` | ✅ 通过 |
| `tsc --noEmit` | ✅ 零错误 |
| `vite build` | ✅ 构建成功（121 modules, 3.78s） |
| 进程清理 | ✅ 3 个旧 node 进程已终止（PID 27128/37588/36992） |

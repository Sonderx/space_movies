# 🎬 极光影院 (Aurora Cinema Hub) - AI 协同开发指南 (AGENT.md)

本文件是为 AI Agent（以及维护者）提供的项目全景上下文、架构约定、命令规范与迭代避坑指南。在进行任何代码修改或功能扩展前，请务必先查阅本文档。

---

## 1. 项目简介与架构全景

- **项目定位**：极简、免安装、轻量级的全网聚合视频搜索与高清解析播放平台。
- **架构模式**：前后端一体化单体架构（FastAPI 提供 RESTful API 并直接挂载托管静态前端资源，支持一键编译为单个免安装 `.exe`）。
- **运行方式**：
  1. 本地 Python 环境启动（`start.bat` / `start.ps1`）
  2. 独立免安装 Windows 可执行程序（`dist/极光影院.exe`）

### 技术栈一览

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **后端框架** | Python 3.10+ / FastAPI / Uvicorn | 异步高性能 Web API 框架 |
| **网络请求** | `httpx` (AsyncClient) | 高并发异步 HTTP 客户端，严禁引入阻塞式 `requests` |
| **爬虫/降级** | 正则匹配 / BeautifulSoup4 / Playwright (可选) | 多源聚合抓取与无头浏览器兜底 |
| **前端技术** | 原生 HTML5 / CSS3 / ES6+ (Vanilla JS) | **无 Node.js / Webpack / Vite 构建流**，纯原生代码 |
| **打包分发** | PyInstaller | 编译单文件 Windows 可执行程序，嵌入 Python 运行时与静态资源 |

---

## 2. 目录结构与职责说明

```text
movies/
├── backend/
│   ├── main.py              # FastAPI 核心服务、路由、静态资源挂载、线路配置、局域网探测
│   ├── scraper.py           # 核心抓取引擎：多平台聚合搜索、URL清洗规范化、爱奇艺/腾讯兜底
│   └── requirements.txt     # Python 后端依赖清单
├── frontend/
│   ├── index.html           # 单页应用 HTML 骨架
│   ├── style.css            # 暗黑影院主题 CSS，响应式布局
│   └── app.js               # 页面交互、搜索渲染、iframe 播放器控制、localStorage 历史管理
├── assets/                  # 效果演示截图与静态图标
├── app_launcher.py          # PyInstaller 打包后的入口文件 (处理 freeze_support & MEIPASS)
├── build_exe.py             # PyInstaller 一键构建与打包脚本
├── start.bat / start.ps1    # 本地一键启动脚本 (自动创建 venv 并拉起服务)
├── test_verify.py           # 自动化接口冒烟与端到端验证脚本
├── README.md                # 面向最终用户的项目使用说明
└── AGENT.md                 # 面向 AI 代理与开发者的技术架构和迭代规范 (本文档)
```

---

## 3. 核心业务与工作机理

### 3.1 聚合搜索链路 (`/api/search`)
1. 用户在前端输入关键词（如“庆余年”），选择全部平台或指定平台（腾讯/爱奇艺/优酷）。
2. 后端首先请求第三方影视公开聚合索引（`api.so.360kan.com`），异步并发解析各平台正片播放链接。
3. **爱奇艺兜底**：若结果少于 3 条，自动并发请求爱奇艺官方提示接口（`suggest.video.iqiyi.com`）补充结果。
4. **腾讯视频兜底**：若指定腾讯视频且未搜出结果，或显式传递 `deep=true`，触发 Playwright 无头浏览器深入拦截渲染数据。
5. 所有链接经过 `normalize_play_url()` 清洗，剥离跟踪打点参数。

### 3.2 播放与解析机制
- **原理解析**：播放并不是后端解密视频，而是通过**第三方解析线路接口**作为中介。
- **合成公式**：`iframe.src = ${线路URL}${规范化后的原站正片URL}`
- **示例**：`https://jx.xmflv.com/?url=https://v.qq.com/x/cover/mzc00200h2j3k4l.html`
- **选集与换源**：推荐线路（如 XMFLV）自身具备在播放器内抓取剧集列表的能力；前端亦可通过备用线路无缝切换。

### 3.3 观影历史
- 无需服务端数据库，直接在前端存储于浏览器的 `localStorage`（键名 `cinema_hub_history`），确保隐私安全并减少服务端状态维护。

---

## 4. 常用开发与运维命令

> **环境约定**：优先使用项目根目录下的 `.venv` 虚拟环境。在 Windows pwsh 中使用 `.\.venv\Scripts\` 下的可执行文件。

### 4.1 依赖安装
```bash
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

### 4.2 本地开发启动 (Hot Reload)
```bash
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
启动后访问：`http://localhost:8000`

### 4.3 自动化测试验证
在服务启动状态下，执行自动化验证脚本：
```bash
.\.venv\Scripts\python.exe test_verify.py
```

### 4.4 打包为单文件 EXE
```bash
.\.venv\Scripts\python.exe build_exe.py
```
构建产物将输出在 `dist/极光影院.exe`。

---

## 5. AI 开发与代码迭代铁律 (Agent Instructions)

在接受用户指令修改或新增功能时，AI 代理需严格遵守以下规则：

### 规则 1：前端绝对不要引入 Node.js 构建链
- 前端为纯原生 HTML/CSS/JS 单页，**切勿**生成 `package.json`、`npm install`、`vite` 或引入 React/Vue 等需要编译的前端框架。
- 所有 UI 变动直接修改 `frontend/index.html`、`frontend/style.css`、`frontend/app.js`。

### 规则 2：必须严格维护 PyInstaller 路径兼容性
- 代码中涉及读取 `frontend` 或静态资源路径时，必须考虑打包后的临时解压目录 `sys._MEIPASS`：
  ```python
  if getattr(sys, "frozen", False):
      BASE_DIR = Path(sys._MEIPASS)
  else:
      BASE_DIR = Path(__file__).resolve().parent.parent
  ```
- 若新增了后端依赖包，必须同步检查 [build_exe.py](file:///f:/code/movies/build_exe.py) 中的 `--hidden-import`，避免打包后缺少模块导致闪退。

### 规则 3：保持异步高性能，禁止使用阻塞请求
- 后端所有 HTTP 请求必须使用 `httpx.AsyncClient` 配合 `await`，**严禁引入 `requests.get` 等同步阻塞库**，以免阻塞整个 FastAPI 的事件循环。
- 所有三方抓取逻辑必须包含充分的 `try...except` 降级，避免单个源失败导致整站搜索崩溃。

### 规则 4：解析线路扩展的联动修改
- 若需要新增或调整视频解析线路：
  1. 修改 [backend/main.py](file:///f:/code/movies/backend/main.py) 的 `PARSE_ROUTES` 字典列表；
  2. 检查 [frontend/index.html](file:///f:/code/movies/frontend/index.html) 中的 `<select id="routeSelect">` 选项（或改由前端在页面加载时调用 `/api/routes` 动态渲染）。

### 规则 5：完成修改后的必须自检
- 任何核心改动（如修改路由、爬虫、前端通信）完成后，需确保：
  1. Python 语法与静态导入无报错；
  2. 运行 `test_verify.py` 验证接口通畅；
  3. 若涉及打包影响，提示用户或协助运行 `build_exe.py` 重新生成 EXE。

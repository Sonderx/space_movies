# 🎬 极光影院 (Aurora Cinema Hub)

> 专为个人打造的轻量级全网聚合视频搜索与高清解析播放平台。支持腾讯视频、爱奇艺、优酷等多主流平台资源一键并发检索、原站集数自动读取与沉浸式无广告影院播放。

[![GitHub release](https://img.shields.io/github/v/release/Sonderx/space_movies?color=blue&style=flat-square)](https://github.com/Sonderx/space_movies/releases)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web-4A90E2?style=flat-square)](https://github.com/Sonderx/space_movies)
[![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)

---

## 📸 效果截图展示

### 1. 影院黑金首页设计
简约现代的黑客/影院暗黑质感界面，支持全网聚合或单平台切换搜索，内置热门影视快捷推荐。
![首页全貌](assets/screenshot_home.png)

### 2. 多源高并发检索结果
一键并发检索腾讯视频、爱奇艺、优酷平台，自动拉取高清封面海报、正片状态与来源平台角标。
![搜索结果展示](assets/screenshot_search.png)

### 3. 沉浸式 16:9 高清解析大屏
无缝平滑展开影院模式播放器，全自动对接无广告解析接口，支持原站多剧集直接选集播放。
![大屏播放界面](assets/screenshot_player.png)

### 4. 本地持久化观影历史记录
右侧抽屉式历史记录栏，自动记录最近观影足迹，随时一键回溯续播。
![观影历史抽屉](assets/screenshot_history.png)

---

## ✨ 核心特性

- 🌐 **全网聚合并发检索**：轻量级高并发抓取引擎，秒级并发聚合腾讯、爱奇艺、优酷影视资源。
- 🎯 **单平台智能筛选**：支持单独检索某一指定平台（腾讯视频 / 爱奇艺 / 优酷）。
- 🎬 **沉浸式影院体验**：响应式 16:9 播放窗口，暗黑影院视觉质感，防反扒、纯净无干扰。
- 🔢 **智能自动集数识别**：解析核心自动识别官方剧集全量列表，选集切换流畅。
- ⚡ **第三方直连秒播**：顶部导航栏贴心设计直连入口，粘贴腾讯/爱奇艺/优酷任意视频链接即可秒播。
- 🔄 **多线路智能容灾**：内置 4 条精选优质高清解析线路，可随时在导航栏无感平滑切换。
- 🕒 **本地隐私观影历史**：所有播放记录保存在浏览器本地 LocalStorage 中，充分保护隐私，随时一键清除。
- 📦 **免安装绿色单文件**：已打包独立 EXE 可执行程序，免装 Python 与额外依赖，开箱即用！

---

## 🚀 快速上手与下载运行

### 方式一：下载 Windows 绿色免安装版（最推荐，免配环境）

1. 前往 GitHub Releases 下载最新版：
   👉 **[点击前往 Releases 下载页面](https://github.com/Sonderx/space_movies/releases)**
2. 下载 `极光影院.exe` 或 `极光影院_绿色免安装版.zip`。
3. 双击运行 `极光影院.exe` 即可，程序会自动在默认浏览器中打开 `http://localhost:8000` 即可开始观影！

---

### 方式二：Windows 脚本一键启动（本地有 Python 环境）

双击项目根目录下的 **`start.bat`**：
- 自动创建并激活 Python 虚拟环境 `.venv`；
- 自动安装必要依赖项；
- 自动拉起后端服务并自动弹开浏览器。

---

### 方式三：开发者手动命令行启动

```bash
# 1. 克隆代码仓库
git clone https://github.com/Sonderx/space_movies.git
cd space_movies

# 2. 创建并激活虚拟环境 (Windows)
python -m venv .venv
.venv\Scripts\activate

# 3. 安装依赖
pip install -r backend/requirements.txt

# 4. 启动后端 Web 服务
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
打开浏览器访问：[http://localhost:8000](http://localhost:8000)

---

## 📁 项目目录结构

```text
space_movies/
├── assets/                  # 项目效果图与演示截图
│   ├── screenshot_home.png
│   ├── screenshot_search.png
│   ├── screenshot_player.png
│   └── screenshot_history.png
├── backend/                 # 后端服务
│   ├── main.py              # FastAPI 核心服务、解析路由、静态托管
│   ├── scraper.py           # 腾讯、爱奇艺、优酷多平台检索爬虫与链接解析引擎
│   └── requirements.txt     # Python 后端依赖清单
├── frontend/                # 前端单页应用
│   ├── index.html           # 前端 HTML5 页面结构
│   ├── style.css            # 暗黑影院质感 CSS 样式与响应式布局
│   └── app.js               # 页面交互、搜索渲染、播放器调度、历史存储
├── app_launcher.py          # 独立 EXE 启动器入口 (打包支持)
├── build_exe.py             # PyInstaller 一键编译打包脚本
├── start.bat                # Windows CMD 一键启动脚本
├── start.ps1                # Windows PowerShell 一键启动脚本
├── test_verify.py           # 自动化测试验证脚本
└── README.md                # 项目详细文档说明
```

---

## 🛠️ 打包为单文件 EXE

如需自行基于最新源码重新打包 EXE：

```bash
# 安装 pyinstaller
pip install pyinstaller

# 运行一键打包脚本
python build_exe.py
```
打包成功后，单文件程序将生成在 `dist/极光影院.exe`。

---

## ⚙️ 扩展自定义解析线路

如需增添新的解析接口，可以在 `backend/main.py` 中的 `PARSE_ROUTES` 列表进行配置：

```python
PARSE_ROUTES = [
    {
        "id": "xmflv",
        "name": "线路 1：XMFLV 解析 (推荐，自带选集列表)",
        "url": "https://jx.xmflv.com/?url=",
        "default": True
    },
    # 可以在此添加新的解析接口...
]
```
同时在前端 `frontend/index.html` 中的 `<select id="routeSelect">` 中增加对应 `<option>` 即可。

---

## ⚠️ 免责声明

1. 本项目仅供个人学习、编程技术研究与交流使用，切勿用于任何商业用途。
2. 本项目不提供、不存储、不上载任何视频内容，所有播放资源均通过互联网公开接口进行实时调度与解析。
3. 视频版权归原权利方（腾讯视频、爱奇艺、优酷等平台）所有，请支持正版影视。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议开源。

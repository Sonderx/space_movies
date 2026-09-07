import os
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

try:
    from scraper import search_aggregated, search_tencent_playwright, resolve_album_to_play_url, normalize_play_url, fetch_qq_episodes
except ImportError:
    from backend.scraper import search_aggregated, search_tencent_playwright, resolve_album_to_play_url, normalize_play_url, fetch_qq_episodes

app = FastAPI(
    title="聚合视频搜索与解析播放服务",
    description="自动检索腾讯、爱奇艺、优酷等主流视频平台资源，一键直连解析播放",
    version="1.0.0"
)

# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 可用解析线路配置
PARSE_ROUTES = [
    {
        "id": "xmflv",
        "name": "线路 1：XMFLV 解析 (推荐，自带选集列表)",
        "url": "https://jx.xmflv.com/?url=",
        "default": True
    },
    {
        "id": "nnxv",
        "name": "线路 2：通用纯净备用 (极速秒播)",
        "url": "https://jx.nnxv.cn/tv.php?url=",
        "default": False
    },
    {
        "id": "ckplayer",
        "name": "线路 3：CKPlayer 高清备用",
        "url": "https://www.ckplayer.vip/jiexi/?url=",
        "default": False
    },
    {
        "id": "jsonplayer",
        "name": "线路 4：JSONPlayer 备用线路",
        "url": "https://jx.jsonplayer.com/player/?url=",
        "default": False
    }
]

@app.get("/api/routes")
async def get_routes():
    """获取所有可用解析线路"""
    return {"code": 200, "data": PARSE_ROUTES}

@app.get("/api/search")
async def search_videos(
    q: str = Query(..., description="搜索关键词，例如：庆余年、狂飙"),
    platform: str = Query("all", description="平台代码：all(全网) | qq(腾讯) | iqiyi(爱奇艺) | youku(优酷)"),
    deep: bool = Query(False, description="是否启用 Playwright 深度浏览器检索")
):
    """
    检索视频资源
    """
    if not q or not q.strip():
        return {"code": 400, "message": "搜索关键词不能为空", "data": []}

    results = await search_aggregated(q.strip(), platform=platform)
    
    # 若指定腾讯视频且未搜到，或者用户显式开启 deep 模式
    if (deep or (platform == "qq" and len(results) == 0)):
        try:
            pw_results = await search_tencent_playwright(q.strip())
            if pw_results:
                existing_urls = {it["url"] for it in results}
                for item in pw_results:
                    if item["url"] not in existing_urls:
                        results.append(item)
        except Exception as e:
            print(f"[Search Engine] Playwright fallback error: {e}")

    return {
        "code": 200,
        "query": q,
        "platform": platform,
        "count": len(results),
        "data": results
    }

@app.get("/api/resolve")
async def resolve_url(
    url: str = Query(..., description="目标视频的播放链接或详情页链接")
):
    """
    解析并规范化视频 URL，处理爱奇艺专辑页转第一集播放页
    """
    if not url or not url.strip():
        return {"code": 400, "message": "URL 不能为空"}

    clean_url = normalize_play_url(url.strip())
    final_url = await resolve_album_to_play_url(clean_url)
    
    return {
        "code": 200,
        "original_url": url,
        "resolved_url": final_url,
        "xmflv_url": f"https://jx.xmflv.com/?url={final_url}"
    }

@app.get("/api/episodes")
async def get_episodes(
    url: str = Query(..., description="视频的播放链接或合集链接")
):
    """
    动态获取视频的所有分集列表（正序排列）
    """
    if not url or not url.strip():
        return {"code": 400, "message": "URL 不能为空", "episodes": []}

    url = url.strip()
    eps = []
    if "v.qq.com" in url:
        eps = await fetch_qq_episodes(url)

    return {
        "code": 200,
        "url": url,
        "count": len(eps),
        "episodes": eps
    }

# 挂载前端静态文件目录
import sys
import socket
import webbrowser
import threading

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent.parent

FRONTEND_DIR = BASE_DIR / "frontend"
if not FRONTEND_DIR.exists():
    FRONTEND_DIR = Path(sys.executable).resolve().parent / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{full_path:path}")
    async def serve_frontend_assets(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def start_server():
    import uvicorn
    local_ip = get_local_ip()
    port = 8000

    print("=" * 60)
    print("         极光影院 (Cinema Hub) 已启动并处于运行中...")
    print("=" * 60)
    print(f" 本机浏览器访问地址 : http://localhost:{port}")
    print(f" 同局域网/手机/平板 : http://{local_ip}:{port}")
    print("=" * 60)
    print(" 提示: 保持本窗口开启即可持续提供观影服务，关闭本窗口退出。")
    print("=" * 60)
    print()

    def open_browser():
        import time
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{port}")

    threading.Thread(target=open_browser, daemon=True).start()

    is_frozen = getattr(sys, "frozen", False)
    uvicorn.run(app, host="0.0.0.0", port=port, reload=not is_frozen)

if __name__ == "__main__":
    start_server()

import asyncio
import re
import urllib.parse
import httpx
from typing import List, Dict, Any, Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
}

def clean_html_tags(text: str) -> str:
    """去除字符串中的 HTML 标签"""
    if not text:
        return ""
    return re.sub(r'<[^>]+>', '', text).strip()

def normalize_play_url(url: str) -> str:
    """
    规范化各平台播放链接，去除跟踪统计参数，并转换为解析接口最兼容的播放格式
    """
    if not url:
        return ""
        
    url = url.strip()
    
    # 1. 优酷: 处理 vid= 参数转为标准 v_show/id_xxx.html 格式
    if "youku.com" in url:
        m = re.search(r'vid=([A-Za-z0-9=_-]+)', url)
        if m:
            return f"https://v.youku.com/v_show/id_{m.group(1)}.html"
        # 去除 url 中的多余参数
        if "?" in url:
            base_url = url.split("?")[0]
            if "/v_show/id_" in base_url:
                return base_url

    # 2. 腾讯视频: 保留 cover/xxx.html 基础路径
    elif "v.qq.com" in url:
        if "?" in url:
            base = url.split("?")[0]
            if "/x/cover/" in base or "/x/page/" in base:
                return base

    # 3. 爱奇艺: 清除跟踪参数
    elif "iqiyi.com" in url:
        if "?" in url:
            base = url.split("?")[0]
            if "/v_" in base or "/a_" in base:
                return base
                
    return url

async def resolve_album_to_play_url(url: str) -> str:
    """
    如果是爱奇艺详情合集页 (a_xxx.html)，尝试提取其正片第一集真实播放链接 (v_xxx.html)
    """
    url = normalize_play_url(url)
    if "iqiyi.com/a_" in url:
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=HEADERS)
                # 匹配 playUrl
                m = re.search(r'href="(https?://www\.iqiyi\.com/v_[^"]+\.html)"', resp.text)
                if m:
                    return m.group(1)
                m2 = re.search(r'"playUrl":"([^"]+)"', resp.text)
                if m2:
                    return m2.group(1).replace("\\/", "/")
        except Exception as e:
            print(f"[Resolver] iQiyi album resolve error: {e}")
    return url

async def fetch_qq_episodes(cid_or_url: str) -> List[Dict[str, str]]:
    """
    通过腾讯视频接口获取完整分集列表（正序从第1集开始）
    """
    if not cid_or_url:
        return []
    cid = cid_or_url
    m = re.search(r'/cover/([a-zA-Z0-9]+)', cid_or_url)
    if m:
        cid = m.group(1)
        
    for proto in ["http", "https"]:
        try:
            url = f"{proto}://node.video.qq.com/x/api/float_vinfo2?cid={cid}"
            async with httpx.AsyncClient(timeout=3.5) as client:
                r = await client.get(url, headers=HEADERS)
                if r.status_code == 200:
                    vids = r.json().get("c", {}).get("video_ids", [])
                    if vids:
                        return [{"title": f"第{i+1}集", "url": f"https://v.qq.com/x/cover/{cid}/{vid}.html"} for i, vid in enumerate(vids)]
        except Exception:
            continue
    return []

async def search_aggregated(keyword: str, platform: str = "all") -> List[Dict[str, Any]]:
    """
    极速聚合检索各大平台影视资源，默认返回第 1 集与分集列表
    platform: 'all' | 'qq' | 'iqiyi' | 'youku'
    """
    results: List[Dict[str, Any]] = []
    if not keyword or not keyword.strip():
        return results

    keyword = keyword.strip()
    
    # 平台映射
    platform_code_map = {
        "qq": ("qq", "腾讯视频"),
        "iqiyi": ("qiyi", "爱奇艺"),
        "youku": ("youku", "优酷"),
        "mgtv": ("imgo", "芒果TV")
    }

    for attempt in range(2):
        try:
            url = f"https://api.so.360kan.com/index?force_act=1&kw={urllib.parse.quote(keyword)}&from="
            async with httpx.AsyncClient(headers=HEADERS, timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    data_obj = data.get("data")
                    rows = []
                    if isinstance(data_obj, dict):
                        long_data = data_obj.get("longData")
                        if isinstance(long_data, dict):
                            rows = long_data.get("rows", [])
                    
                    for r in rows:
                        raw_title = clean_html_tags(r.get("title", ""))
                        cover = r.get("cover", "")
                        cat_name = r.get("cat_name", "影视")
                        desc = clean_html_tags(r.get("desc") or r.get("act") or "")
                        year = r.get("year", "")
                        playlinks = r.get("playlinks", {})
                        series_playlinks = r.get("seriesPlaylinks", [])
                        series_site = r.get("seriesSite", "")

                        # 抽取平台视频信息的内部辅助函数
                        async def build_item(p_key: str, s_key: str, p_display: str) -> Optional[Dict[str, Any]]:
                            if s_key not in playlinks:
                                return None
                            link_data = playlinks[s_key]
                            raw_url = ""
                            if isinstance(link_data, str):
                                raw_url = link_data
                            elif isinstance(link_data, list) and len(link_data) > 0:
                                raw_url = link_data[0].get("url", "")

                            if not raw_url:
                                return None

                            episodes: List[Dict[str, str]] = []

                            # 1. 检查 360kan 剧集列表
                            if series_playlinks and (series_site == s_key or not series_site):
                                for i, it in enumerate(series_playlinks):
                                    ep_url = it.get("url") if isinstance(it, dict) else it
                                    if ep_url:
                                        episodes.append({
                                            "title": f"第{i+1}集",
                                            "url": normalize_play_url(ep_url)
                                        })

                            # 2. 如果是腾讯视频且尚无选集列表，尝试从腾讯官方拉取正序分集
                            if not episodes and (p_key == "qq" or s_key == "qq") and "v.qq.com" in raw_url:
                                qq_eps = await fetch_qq_episodes(raw_url)
                                if qq_eps:
                                    episodes = qq_eps

                            # 默认第1集地址：如果有分集则取第1集；否则去除腾讯特定单集vid保留专辑根路径，避免锁定末集
                            if episodes:
                                default_url = episodes[0]["url"]
                            else:
                                if "v.qq.com" in raw_url:
                                    m_cid = re.search(r'/cover/([a-zA-Z0-9]+)', raw_url)
                                    if m_cid:
                                        default_url = f"https://v.qq.com/x/cover/{m_cid.group(1)}.html"
                                    else:
                                        default_url = normalize_play_url(raw_url)
                                else:
                                    default_url = normalize_play_url(raw_url)

                            return {
                                "title": raw_title,
                                "url": default_url,
                                "first_episode_url": default_url,
                                "episodes": episodes,
                                "cover": cover,
                                "desc": desc,
                                "category": cat_name,
                                "platform": p_key,
                                "platform_name": p_display,
                                "year": year
                            }

                        # 如果用户指定了单平台
                        if platform != "all":
                            target_key = "qiyi" if platform == "iqiyi" else platform
                            p_display_name = "爱奇艺" if platform == "iqiyi" else ("腾讯视频" if platform == "qq" else ("优酷" if platform == "youku" else "影视"))
                            item = await build_item(platform, target_key, p_display_name)
                            if item:
                                results.append(item)
                        else:
                            # 全网聚合模式：遍历各大主流平台
                            for p_k, (s_k, p_disp) in platform_code_map.items():
                                item = await build_item(p_k, s_k, p_disp)
                                if item:
                                    results.append(item)
                    break
        except Exception as e:
            if attempt == 1:
                print(f"[Search Engine] Aggregate search error: {e}")
            await asyncio.sleep(0.3)

    # 如果指定爱奇艺平台或者全网聚合但结果较少，补充爱奇艺直连检索
    if (platform in ("all", "iqiyi")) and len(results) < 3:
        iqiyi_supplements = await search_iqiyi_direct(keyword)
        # 去重追加
        existing_urls = {item["url"] for item in results}
        for item in iqiyi_supplements:
            if item["url"] not in existing_urls:
                results.append(item)

    return results

async def search_iqiyi_direct(keyword: str) -> List[Dict[str, Any]]:
    """调用爱奇艺官方提示接口检索影片列表"""
    results = []
    try:
        url = f"https://suggest.video.iqiyi.com/?key={urllib.parse.quote(keyword)}"
        async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", [])
                for it in items:
                    name = it.get("name", "")
                    link = it.get("link", "")
                    pic = it.get("picture_url", "")
                    cat = it.get("cname", "爱奇艺精选")
                    actors = it.get("main_actor", [])
                    desc = f"主演：{', '.join(actors[:4])}" if actors else ""
                    if name and link:
                        results.append({
                            "title": name,
                            "url": normalize_play_url(link),
                            "cover": pic,
                            "desc": desc,
                            "category": cat or "影视",
                            "platform": "iqiyi",
                            "platform_name": "爱奇艺",
                            "year": ""
                        })
    except Exception as e:
        print(f"[iQiyi Direct] search error: {e}")
    return results

async def search_tencent_playwright(keyword: str) -> List[Dict[str, Any]]:
    """
    使用 Playwright 无头浏览器深入抓取腾讯视频精准检索卡片（可选降级）
    """
    try:
        from playwright.async_api import async_playwright
    except (ImportError, ModuleNotFoundError):
        print("[Playwright Tencent] Playwright not installed or excluded in build, skipping.")
        return []

    results = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            page = await browser.new_page()
            
            # 监听腾讯视频搜索响应中的 MbSearch JSON
            async def on_resp(resp):
                if "MultiTerminalSearch/MbSearch" in resp.url:
                    try:
                        data = await resp.json()
                        item_list = data.get("data", {}).get("normalList", {}).get("itemList", [])
                        for item in item_list:
                            doc = item.get("videoInfo") or {}
                            base_doc = item.get("doc") or {}
                            title = doc.get("title") or item.get("title")
                            cid = base_doc.get("id") or ""
                            play_url = doc.get("playLongUrl")
                            if not play_url and cid:
                                play_url = f"https://v.qq.com/x/cover/{cid}.html"
                            img = doc.get("imgUrl") or doc.get("dynamicImgUrl") or ""
                            desc = doc.get("subTitle") or doc.get("descrip") or ""
                            cat = doc.get("typeName") or "腾讯视频"
                            if title and play_url:
                                results.append({
                                    "title": title,
                                    "url": normalize_play_url(play_url),
                                    "cover": img,
                                    "desc": desc,
                                    "category": cat,
                                    "platform": "qq",
                                    "platform_name": "腾讯视频",
                                    "year": doc.get("year", "")
                                })
                    except Exception:
                        pass

            page.on("response", on_resp)
            url = f"https://v.qq.com/x/search/?q={urllib.parse.quote(keyword)}"
            await page.goto(url, wait_until="domcontentloaded", timeout=12000)
            await page.wait_for_timeout(2500)
            await browser.close()
    except Exception as e:
        print(f"[Playwright Tencent] error: {e}")
    return results

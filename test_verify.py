import httpx
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')


base = "http://127.0.0.1:8000"

def test_endpoints():
    print("Testing GET / ...")
    r = httpx.get(f"{base}/", timeout=5)
    print("GET / Status:", r.status_code, "HTML title present:", "<title>" in r.text)
    assert r.status_code == 200

    print("\nTesting GET /api/routes ...")
    r = httpx.get(f"{base}/api/routes", timeout=5)
    print("Routes:", r.json())
    assert r.status_code == 200

    print("\nTesting GET /api/search?q=庆余年&platform=all ...")
    r = httpx.get(f"{base}/api/search?q=庆余年&platform=all", timeout=10)
    data = r.json()
    print("Search status:", data.get("code"), "Count:", data.get("count"))
    for item in data.get("data", [])[:3]:
        print(f"  [{item['platform_name']}] {item['title']} -> {item['url']}")
    assert data.get("count", 0) > 0

    print("\nTesting GET /api/search?q=狂飙&platform=iqiyi ...")
    r = httpx.get(f"{base}/api/search?q=狂飙&platform=iqiyi", timeout=10)
    data = r.json()
    print("iQiyi search status:", data.get("code"), "Count:", data.get("count"))
    for item in data.get("data", [])[:3]:
        print(f"  [{item['platform_name']}] {item['title']} -> {item['url']}")
    assert data.get("count", 0) > 0

    print("\nTesting GET /api/resolve ...")
    r = httpx.get(f"{base}/api/resolve?url=http://www.iqiyi.com/a_1fkgtbddd2x.html", timeout=10)
    res_data = r.json()
    print("Resolved URL:", res_data.get("resolved_url"))
    print("XMFLV URL:", res_data.get("xmflv_url"))
    assert "v_" in res_data.get("resolved_url", "")

    print("\n✅ ALL ENDPOINTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_endpoints()

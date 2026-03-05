import httpx
from cachetools import TTLCache

# Cache API results for 60 seconds
_cache = TTLCache(maxsize=100, ttl=60)

# Base URLs for known services — update these to match your environment
SERVICE_BASE_URLS = {
    "prospector": "http://localhost:8080",
    "sliderule": "https://sliderule.sqprod.co",
    "datadog": "https://api.datadoghq.com/api/v1",
}


async def proxy_api_call(
    service: str,
    method: str,
    path: str,
    body: dict | None = None,
    headers: dict | None = None,
) -> dict:
    """Proxy an API call to the specified service."""
    base_url = SERVICE_BASE_URLS.get(service)
    if not base_url:
        return {"error": f"Unknown service: {service}. Known: {list(SERVICE_BASE_URLS.keys())}"}

    url = f"{base_url}{path}"
    cache_key = (method, url, str(body))

    if method == "GET" and cache_key in _cache:
        return _cache[cache_key]

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            method=method,
            url=url,
            json=body,
            headers=headers or {},
        )
        result = {
            "status": response.status_code,
            "data": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
        }

    if method == "GET":
        _cache[cache_key] = result
    return result

import asyncio
import httpx
from cachetools import TTLCache

SLIDERULE_BASE = "https://prod-sliderule-api--sliderule.sqprod.co"

TRIGGER_WORKFLOW_MAP = {
    "TD_CL08": 888,
    "TD_CL12": 883,
    "TD_CL14": 877,
    "TD_CL18": 862,
    "TD_CL20": 1005,
}

# Cache deploy logs for 10 minutes
_cache = TTLCache(maxsize=10, ttl=600)


async def fetch_workflow_versions(workflow_id: int) -> list[dict]:
    """Fetch all versions for a workflow from Sliderule API."""
    url = f"{SLIDERULE_BASE}/v1/workflow/{workflow_id}/versions?pageSize=100&pageNumber=0"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        return data.get("items", [])


async def fetch_all_deploy_logs() -> dict[str, list[dict]]:
    """Fetch version logs for all triggers in parallel. Returns {trigger: [versions]}."""
    cache_key = "all_deploy_logs"
    if cache_key in _cache:
        return _cache[cache_key]

    async def _fetch(trigger: str, wf_id: int):
        versions = await fetch_workflow_versions(wf_id)
        # Return most recent first
        versions.reverse()
        return trigger, versions

    tasks = [_fetch(t, wf) for t, wf in TRIGGER_WORKFLOW_MAP.items()]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    logs = {}
    for result in results:
        if isinstance(result, Exception):
            continue
        trigger, versions = result
        logs[trigger] = versions

    _cache[cache_key] = logs
    return logs

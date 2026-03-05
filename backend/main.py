from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Any
import yaml
import os
import sys

# Ensure backend/ is on the Python path for both local and packaged runs
sys.path.insert(0, os.path.dirname(__file__))

from data_sources.snowflake_source import run_snowflake_query
from data_sources.api_source import proxy_api_call
from data_sources.sliderule_source import fetch_all_deploy_logs

app = FastAPI(title="Monitoring Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    sql: str
    warehouse: str | None = None


class ApiProxyRequest(BaseModel):
    service: str  # e.g. "prospector", "sliderule", "datadog"
    method: str = "GET"
    path: str
    body: dict[str, Any] | None = None
    headers: dict[str, str] | None = None


@app.get("/api/dashboards")
def list_dashboards():
    """List all dashboard configs from the dashboards/ directory."""
    dashboards_dir = os.path.join(os.path.dirname(__file__), "dashboards")
    dashboards = []
    for fname in os.listdir(dashboards_dir):
        if fname.endswith((".yaml", ".yml")):
            with open(os.path.join(dashboards_dir, fname)) as f:
                config = yaml.safe_load(f)
                if config:
                    dashboards.append(config)
    return dashboards


@app.get("/api/dashboards/{name}")
def get_dashboard(name: str):
    """Get a specific dashboard config by name."""
    dashboards_dir = os.path.join(os.path.dirname(__file__), "dashboards")
    for fname in os.listdir(dashboards_dir):
        if fname.endswith((".yaml", ".yml")):
            with open(os.path.join(dashboards_dir, fname)) as f:
                config = yaml.safe_load(f)
                if config and config.get("name") == name:
                    return config
    raise HTTPException(status_code=404, detail=f"Dashboard '{name}' not found")


@app.post("/api/query")
async def execute_query(req: QueryRequest):
    """Execute a Snowflake SQL query and return results."""
    try:
        result = await run_snowflake_query(req.sql, req.warehouse)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/proxy")
async def proxy_request(req: ApiProxyRequest):
    """Proxy an API call to an external service."""
    try:
        result = await proxy_api_call(
            service=req.service,
            method=req.method,
            path=req.path,
            body=req.body,
            headers=req.headers,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sliderule/deploy-logs")
async def get_deploy_logs():
    """Fetch deployment version logs for all configured triggers."""
    try:
        return await fetch_all_deploy_logs()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve built frontend static files (if they exist)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the React SPA for any non-API route."""
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

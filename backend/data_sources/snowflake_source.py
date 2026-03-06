import asyncio
from decimal import Decimal
from datetime import datetime, date
from cachetools import TTLCache

# Cache query results for 5 minutes
_cache = TTLCache(maxsize=100, ttl=300)

DEFAULT_WAREHOUSE = "ADHOC__XLARGE"


def _serialize_value(val):
    """Convert Snowflake types to JSON-serializable values."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return val


async def run_snowflake_query(sql: str, warehouse: str | None = None) -> dict:
    """Execute a Snowflake query via pysnowflake and return columns + rows."""
    cache_key = (sql, warehouse)
    if cache_key in _cache:
        return _cache[cache_key]

    result = await asyncio.to_thread(_execute_sync, sql, warehouse)
    _cache[cache_key] = result
    return result


import os

def _get_auth():
    """Get Snowflake auth - use block_cloud_auth on GCP/cloud, default (Okta SSO) locally."""
    # Only use block_cloud_auth in cloud environments (GCP, AWS, Databricks)
    if not any(os.environ.get(v) for v in (
        "K_SERVICE",           # Cloud Run
        "SERVICE_ACCOUNT",     # GCP workstation/notebook
        "CLOUD_ML_JOB_SA",    # Vertex AI
        "NAMESPACE",           # SKI/K8s
    )):
        return None
    try:
        from block_cloud_auth.authenticators.snowflake import (
            SnowflakeAuthenticator,
            SnowflakeProvider,
        )
        return SnowflakeAuthenticator(SnowflakeProvider())
    except ImportError:
        return None


def _execute_sync(sql: str, warehouse: str | None) -> dict:
    try:
        from pysnowflake.session import Session

        auth = _get_auth()
        session_kwargs = {
            "connection_override_args": {
                "warehouse": warehouse or DEFAULT_WAREHOUSE,
            },
        }
        if auth is not None:
            session_kwargs["auth"] = auth

        sess = Session(**session_kwargs)
        sess.open()
        try:
            cursor = sess.execute(sql)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            return {
                "columns": columns,
                "rows": [[_serialize_value(v) for v in row] for row in rows],
            }
        finally:
            sess.close()
    except ImportError:
        return _mock_query(sql)


def _mock_query(sql: str) -> dict:
    """Return mock data so the frontend works without pysnowflake."""
    import random
    from datetime import timedelta

    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(30, 0, -1)]

    return {
        "columns": ["date", "value"],
        "rows": [[d, random.randint(100, 1000)] for d in dates],
        "_mock": True,
    }

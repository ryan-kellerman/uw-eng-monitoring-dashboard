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


def _execute_sync(sql: str, warehouse: str | None) -> dict:
    try:
        from pysnowflake.session import Session

        sess = Session(connection_override_args={
            "warehouse": warehouse or DEFAULT_WAREHOUSE,
        })
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

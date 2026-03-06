# UW Engineering Monitoring Dashboard

Internal monitoring dashboard for Borrow underwriting. Aggregates Snowflake query results and Sliderule deployment logs into a single interface with charts, KPIs, and data tables.

## Quick Start

```bash
./start.sh
```

This installs dependencies, builds the frontend (if needed), and starts the server at **http://localhost:8000**.

On first run, Snowflake will open a browser window for Okta SSO authentication.

## Manual Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Access to Block's internal PyPI (`global.block-artifacts.com`)

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### Run

```bash
source .venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The dashboard is served at http://localhost:8000.

For frontend development with hot reload, run the Vite dev server in a separate terminal:

```bash
cd frontend
npm run dev
```

This starts a dev server at http://localhost:5173 that proxies API calls to the backend.

## Cloud Run Deployment

The dashboard can be deployed to GCP Cloud Run. A pre-built image exists in Artifact Registry.

### Redeploy from existing image

```bash
gcloud run deploy uw-dashboard \
  --image us-central1-docker.pkg.dev/sq-cash-ucml-prod/uw-dashboard/uw-dashboard:latest \
  --platform managed --region us-central1 --port 8000 \
  --project=sq-cash-ucml-prod
```

### Rebuild and deploy

```bash
# Build frontend locally (Cloud Build can't access npm registry)
cd frontend && npm run build && cd ..

# Download vendored Python packages (Cloud Build can't access internal PyPI)
pip download -d vendor/ -r backend/requirements.txt \
  --index-url https://global.block-artifacts.com/artifactory/api/pypi/block-pypi/simple \
  --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all:

# Build and push via Cloud Build
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/sq-cash-ucml-prod/uw-dashboard/uw-dashboard:latest \
  --project=sq-cash-ucml-prod --region=us-central1

# Deploy
gcloud run deploy uw-dashboard \
  --image us-central1-docker.pkg.dev/sq-cash-ucml-prod/uw-dashboard/uw-dashboard:latest \
  --platform managed --region us-central1 --port 8000 \
  --project=sq-cash-ucml-prod
```

### Snowflake Auth

- **Local**: Uses Okta SSO via browser (default `pysnowflake` auth)
- **Cloud Run**: Uses `block-cloud-auth` with the service account's RSA key pair. Requires a Snowflake robot user configured at `go/snowfort/robot_users`

## Architecture

```
backend/
  main.py                  # FastAPI app with API routes + static file serving
  dashboards/              # YAML dashboard configurations
    example.yaml           # Borrow UW monitoring dashboard config
  data_sources/
    snowflake_source.py    # Snowflake query execution with caching
    api_source.py          # External API proxy
    sliderule_source.py    # Sliderule deployment version logs

frontend/
  src/
    api.ts                 # API client
    types.ts               # TypeScript interfaces
    components/
      Dashboard.tsx        # Main dashboard layout with parameter bar
      Widget.tsx           # Data fetching + client-side filtering
      ChartWidget.tsx      # ECharts line/bar charts
      KpiWidget.tsx        # Single-value KPI cards
      TableWidget.tsx      # Data tables
      DeployLog.tsx        # Sliderule deployment log sidebar
```

## Dashboard Configuration

Dashboards are defined in YAML files under `backend/dashboards/`. Each dashboard has:

- **parameters**: Dropdowns for filtering (e.g., trigger selection). Uses `filter_column` for client-side filtering — one query fetches all data, the frontend filters instantly.
- **widgets**: Charts, KPIs, and tables with Snowflake SQL queries, layout positions, and display options.

### Supported widget types

| Type | Description | Key options |
|------|-------------|-------------|
| `line_chart` | Multi-series line chart | `series_column`, `x_column`, `y_column`, `y_format` |
| `bar_chart` | Bar chart | Same as line_chart |
| `kpi` | Single number | `suffix` (e.g., "%") |
| `table` | Data table | — |

## Key Features

- **Instant trigger switching**: All 5 triggers (TD_CL08, TD_CL12, TD_CL14, TD_CL18, TD_CL20) are fetched in one query. Selecting a different trigger filters client-side with no re-fetch.
- **Sliderule deploy log**: Shows deployment version history for each trigger's workflow, with active version highlighted.
- **Auto-refresh**: Widgets refresh on configurable intervals (default 5-10 min).
- **Query caching**: Backend caches Snowflake results for 5 minutes.

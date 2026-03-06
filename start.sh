#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -q -r backend/requirements.txt

# Install frontend dependencies and build if needed
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

# Start the server
echo ""
echo "Starting dashboard at http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

FROM python:3.12-slim
WORKDIR /app

COPY vendor/ ./vendor/
RUN pip install --no-cache-dir --no-index --find-links=vendor/ vendor/*.whl && rm -rf vendor/

COPY backend/ ./backend/
COPY frontend/dist ./frontend/dist

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

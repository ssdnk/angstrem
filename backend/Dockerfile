FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    uvicorn==0.29.0 \
    "sqlalchemy>=2.0.36" \
    "python-jose[cryptography]==3.3.0" \
    bcrypt \
    "pydantic>=2.6" \
    python-multipart==0.0.9

COPY app/ ./app/
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh && mkdir -p /data

ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:////data/database.db

EXPOSE 8000

CMD ["./entrypoint.sh"]

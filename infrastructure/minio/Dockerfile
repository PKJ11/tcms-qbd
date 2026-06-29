FROM quay.io/minio/minio:latest

LABEL maintainer="TCMS Development Team"
LABEL description="MinIO object storage for TCMS"

EXPOSE 9000
EXPOSE 9001

HEALTHCHECK \
  --interval=30s \
  --timeout=20s  \
  --start-period=10s \
  --retries=3    \
  CMD curl -f http://localhost:9000/minio/health/live || exit 1

CMD ["server", "/data", "--console-address", ":9001"]
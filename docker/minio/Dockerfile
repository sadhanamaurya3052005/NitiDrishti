# Official MinIO server — Docker Hub minio/minio was removed (2026).
# Build from the last GitHub release that publishes linux-amd64 binaries.
# RELEASE.2025-10-15T17-29-55Z is source-only (no release assets).
FROM alpine:3.20

ARG MINIO_RELEASE=RELEASE.2025-09-07T16-13-09Z
RUN apk add --no-cache ca-certificates curl \
    && curl -fsSL \
      "https://github.com/minio/minio/releases/download/${MINIO_RELEASE}/minio.linux-amd64.${MINIO_RELEASE}" \
      -o /usr/bin/minio \
    && chmod +x /usr/bin/minio \
    && minio --version

EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]

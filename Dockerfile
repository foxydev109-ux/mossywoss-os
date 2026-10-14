# MossyWoss OS — reproducible build & test environment.
# Builds the OS and runs the full test battery without installing
# anything on your machine:
#   docker build -t mwo-build .
#   docker run --rm -v "$PWD":/app mwo-build
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 nodejs npm zip unzip ca-certificates \
    && apt-get clean

WORKDIR /app
COPY . /app

RUN npm install jsdom --no-fund --no-audit

# Build the single-file OS, then run the whole test battery.
CMD ["bash", "-c", "python3 mw_assemble.py && \
  node tests/smoketest.js && \
  node tests/freshtest.js && \
  node tests/secondboot.js && \
  node tests/browsertest.js && \
  node tests/cinterp_test.js && \
  node tests/vrvoxel_test.js && \
  node tests/publisher_storetest.js && \
  echo 'ALL TESTS PASSED IN CONTAINER'"]

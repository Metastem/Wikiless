# For reference to update this file
#https://hub.docker.com/_/node/
#https://github.com/GoogleContainerTools/distroless/blob/main/README.md

# Build stage arguments (needed for npm install permissions)
ARG UID=200003
ARG GID=200003

FROM node:24.7-alpine3.21 AS build

ARG UID=200003
ARG GID=200003

WORKDIR /wikiless
COPY . /wikiless

# Create user in build stage for proper permissions
RUN addgroup -g $GID appgroup && \
    adduser -u $UID -G appgroup -s /bin/sh -D appuser && \
    chown -R appuser:appgroup /wikiless

USER appuser
# Clean npm cache to reduce image size:
RUN npm ci --only=production --omit=optional && npm cache clean --force

# Runtime stage needs redeclared arguments
ARG UID=200003
ARG GID=200003

FROM gcr.io/distroless/nodejs24-debian12

ARG UID=200003
ARG GID=200003

WORKDIR /wikiless

# removing build artifacts (Only copy what's strictly necessary for runtime.)
COPY --from=build --chown=$UID:$GID /wikiless/package.json ./
COPY --from=build --chown=$UID:$GID /wikiless/package-lock.json ./
COPY --from=build --chown=$UID:$GID /wikiless/node_modules ./node_modules
COPY --from=build --chown=$UID:$GID /wikiless/src ./src
COPY --from=build --chown=$UID:$GID /wikiless/media ./media
COPY --from=build --chown=$UID:$GID /wikiless/static ./static

# Distroless doesn't have useradd, so we directly specify UID
USER $UID

# Health Monitoring
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]

COPY --from=build --chown=$UID:$GID /wikiless/wikiless.config ./wikiless.config
CMD ["src/wikiless.js"]

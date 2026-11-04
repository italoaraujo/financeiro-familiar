# MCP Server Docker Container Specification

## Problem Statement

Users and developers of the Personal & Family Financial Management System need to run the Model Context Protocol (MCP) server inside a dedicated Docker container orchestrating alongside the existing `postgres`, `backend` (`api`), and `frontend` services in `docker-compose.yml`. Running the MCP server in a container provides isolated HTTP/SSE remote transport for external and local AI assistants (such as Google Gemini connected apps, Claude Web, or remote IDEs), reproducible builds, automatic restart policies, health checks, and seamless communication with the backend service via the internal Docker network.

## Goals

- [ ] Provide a production-grade multi-stage `Dockerfile` and `.dockerignore` for `mcp-server` based on Node.js 20 Alpine.
- [ ] Add the `mcp` service definition into `docker-compose.yml` under configurable profiles (`mcp`, `all`).
- [ ] Enable containerized HTTP/SSE transport communicating with the backend REST API at `http://api:3001` with container health checks on `GET /health`.
- [ ] Document Docker environment variables and execution commands in `.env.example`, `.env`, and README files.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Standalone STDIO execution inside Docker background daemon | Background docker daemon containers communicate over HTTP/SSE ports; STDIO remains client-attached or local |
| Creating an external public tunnel service inside the container | Tunneling tools like Cloudflare Tunnel or ngrok belong to host or dedicated reverse-proxy infrastructure |
| Direct database access from MCP container | MCP must exclusively communicate with the backend REST API (`api:3001`) preserving domain rules |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Base image | `node:20-alpine` | Matches the backend and frontend Node.js version and Alpine base for minimal image size and consistency | y |
| Multi-stage build | Stage 1 (builder) with dev dependencies and TypeScript build; Stage 2 (runner) with production dependencies only | Keeps final production Docker image compact and secure | y |
| Container security user | Non-root `node` user in runner stage | Follows security best practices by avoiding running processes as root in container | y |
| Compose profile | `profiles: ["mcp", "all"]` | Allows running the MCP container on-demand without forcing it onto setups running only `app,db` | y |
| Internal API networking | `MCP_API_URL=http://api:3001` | Uses Docker Compose internal DNS service discovery on the shared network | y |
| Container health check | `wget -qO- http://127.0.0.1:3333/health` | Uses built-in Alpine BusyBox `wget` to query the existing `/health` route with zero external dependencies | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Containerized MCP Server Build & Orchestration ⭐ MVP

**User Story**: As a system administrator or developer, I want to build and run the MCP server in a Docker container using Docker Compose so that the AI integration runs reliably and automatically alongside the backend and database.

**Why P1**: Essential for deployment, containerized local development, and AI assistant connectivity.

**Acceptance Criteria**:

1. WHEN the MCP Docker image is built THEN the system SHALL compile the TypeScript source in a build stage and generate a production image containing only production dependencies, running as non-root user `node`.
2. WHEN `docker compose --profile mcp up` is executed THEN the system SHALL start the `financial-mcp` container connected to the compose default network.
3. WHEN the container runs THEN the system SHALL start the HTTP transport listening on `0.0.0.0:3333` and communicate with the backend API at `http://api:3001`.
4. WHEN Docker executes the container healthcheck THEN the system SHALL query `GET /health` on port 3333 and mark the container healthy when status is 200 OK.
5. WHEN environment variables `MCP_PORT`, `HOST_BIND_IP`, `MCP_API_TOKEN` are set in `.env` THEN the compose service SHALL bind the specified host port and forward the credentials to the container.

**Independent Test**: Build the MCP image, start the container via Docker Compose profile, check `docker compose ps` for healthy status, and send a GET request to `http://localhost:3333/health`.

---

## Requirement Traceability

| Requirement ID | Acceptance Criterion | Verification Method | Status |
| -------------- | -------------------- | ------------------- | ------ |
| MCP-101 | AC 1 (Multi-stage build & non-root user) | Dockerfile inspection & `docker build` | Verified |
| MCP-102 | AC 2 (Docker Compose service definition & profile) | `docker compose config` & `docker compose up` | Verified |
| MCP-103 | AC 3 (HTTP transport & backend connectivity) | Container logs inspection & HTTP request | Verified |
| MCP-104 | AC 4 (Health check on `/health`) | `docker inspect --format '{{.State.Health.Status}}'` | Verified |
| MCP-105 | AC 5 (Configurable environment variables) | `.env.example` check & port binding verification | Verified |

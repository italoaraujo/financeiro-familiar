# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat tzdata
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat tzdata
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333
ENV MCP_HTTP_PORT=3333
ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_TRANSPORT=http
ENV MCP_API_URL=http://api:3001
ENV TZ=America/Sao_Paulo

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && chown -R node:node /app

COPY --chown=node:node --from=builder /app/dist ./dist

USER node

EXPOSE 3333

CMD ["node", "dist/index.js", "--http"]

# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat tzdata
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat tzdata
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV TZ=America/Sao_Paulo

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && if [ \"$APP_ENV\" = \"development\" ] || [ \"$ENABLE_SEED\" = \"true\" ]; then node dist/prisma/seed.js; fi && if [ -f dist/src/main.js ]; then node dist/src/main.js; else node dist/main.js; fi"]

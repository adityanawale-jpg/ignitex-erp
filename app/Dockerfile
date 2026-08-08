# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes env vars at build time — pass them as build args
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_UPLOADS_BASE_URL=
ARG VITE_APP_NAME=IgniteX.ai ERP
ARG VITE_APP_VERSION=1.0.0

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_UPLOADS_BASE_URL=$VITE_UPLOADS_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# ── Stage 2: Nginx ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ 2>/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

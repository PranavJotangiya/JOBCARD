# ---- build stage -------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install backend deps (incl. dev) using only the backend manifests for caching.
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.build.json ./
RUN npm ci

COPY src ./src
RUN npm run build            # -> dist/

# Prune to production dependencies only.
RUN npm ci --omit=dev

# ---- runtime stage ----------------------------------------------------------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as the built-in non-root user.
USER node

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./

# Local file-storage dir (ephemeral on hosts without a persistent disk — see docs).
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

# Render/most hosts inject PORT; the app reads it via env.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]

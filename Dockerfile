# ── Compilación del frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Se incrusta durante el build de CRA: dentro del contenedor frontend y API
# comparten origen incluso al abrirse como localhost:3000.
ENV REACT_APP_SAME_ORIGIN_API=true

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY public ./public
COPY src ./src
RUN npm run build

# ── Imagen de ejecución ───────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV SERVE_STATIC=true

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY api ./api
COPY middleware ./middleware
COPY --from=build /app/build ./build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "api/index.js"]

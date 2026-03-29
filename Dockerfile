FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx tsc -p tsconfig.build.json 2>&1; echo "--- tsc exit: $? ---"; ls -la /app/ | head -30; echo "--- dist:"; ls -la /app/dist/ 2>/dev/null || echo "dist does not exist"

FROM node:20-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./src/assets

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main"]

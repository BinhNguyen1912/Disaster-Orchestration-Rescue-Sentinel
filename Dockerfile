# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --ignore-scripts

COPY . .
RUN npm run build

# ===== Stage 2: Production =====
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 8585

CMD ["node", "dist/main"]
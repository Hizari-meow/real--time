FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy workspace configurations
COPY package.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# Install all dependencies and build
RUN npm install
RUN npm run build --workspace=packages/shared
RUN cd packages/server && npx prisma generate
RUN npm run build --workspace=packages/server

FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Copy from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/server ./packages/server

WORKDIR /app/packages/server

EXPOSE 4001 4002

CMD ["node", "dist/index.js"]

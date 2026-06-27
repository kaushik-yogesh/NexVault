# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /usr/src/app

# Only copy necessary files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package.json ./

# Add non-root user for security
RUN addgroup -S nexvault && adduser -S nexvault -G nexvault
USER nexvault

EXPOSE 5000

CMD ["npm", "start"]

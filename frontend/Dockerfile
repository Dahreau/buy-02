FROM node:20-alpine

WORKDIR /app

# Install dependencies (including dev deps for ng CLI)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 4200

# Use the local Angular CLI to serve the app
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200"]

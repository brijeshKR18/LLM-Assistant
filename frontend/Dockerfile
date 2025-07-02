# Build step
FROM node:22 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve step
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy build output to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose nginx port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

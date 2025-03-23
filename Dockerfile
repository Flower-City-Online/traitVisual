# Stage 1: Build Angular application
FROM node:22-slim AS build
WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm install

# Copy source files
COPY . .

# Build Angular application
RUN npm run build

# Stage 2: Serve using NGINX
FROM nginx:1.25-alpine

# Remove default NGINX config
RUN rm -rf /etc/nginx/conf.d/*

# Copy built assets from previous stage
COPY --from=build /app/dist/solar-system-of-people/browser /usr/share/nginx/html

# Copy custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (default HTTP port)
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
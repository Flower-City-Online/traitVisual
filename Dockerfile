# Stage 1: Build the Angular application
FROM node:22 AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code and build the project for production
COPY . .
RUN npm run build -- --configuration production

#-----------------------------------------------------------------------

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine
# Copy build output to Nginx's default public folder
COPY --from=build /app/dist/solar-system-of-people /usr/share/nginx/html

# Expose port 80 for the container
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

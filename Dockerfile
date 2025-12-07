# --- Stage 1: Build the React Application ---
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
# We use --legacy-peer-deps to prevent issues with React 19 peer dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build the application
# This will read your .env file to bake the API key into the app
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy the built assets from the 'dist' folder (Vite's default output)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config to the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Required for Cloud Run)
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
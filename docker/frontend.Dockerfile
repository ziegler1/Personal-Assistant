# Build context: repo root
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
ENV PORT=80
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=3000
EXPOSE 80

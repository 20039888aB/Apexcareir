FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json vite.config.ts index.html ./
COPY src ./src

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine

# Docker Compose default. On Render set BACKEND_HOST to "<django-service-name>:$PORT"
ENV BACKEND_HOST=backend:8000
# Only substitute BACKEND_HOST — keep nginx vars like $host intact
ENV NGINX_ENVSUBST_FILTER=BACKEND_HOST

# Official nginx image runs envsubst on /etc/nginx/templates/*.template
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

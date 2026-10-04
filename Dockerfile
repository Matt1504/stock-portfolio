FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS development
COPY . .
ENV HOST=0.0.0.0 PORT=80 BROWSER=none
EXPOSE 80
CMD ["npm", "start"]

FROM dependencies AS build
COPY tsconfig.json ./
COPY public/ ./public/
COPY src/ ./src/
ARG REACT_APP_GRAPHQL_URL=/graphql
ENV REACT_APP_GRAPHQL_URL=${REACT_APP_GRAPHQL_URL}
RUN npm run build

FROM nginx:stable-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1

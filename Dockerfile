FROM node:22-alpine AS build

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.11.3 /uv /uvx /bin/
RUN apk add --no-cache python3 py3-pip

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_BASE_PATH=/artemis-2/
ARG VITE_APP_URL=https://pzarzycki.github.io/artemis-2/
ARG VITE_SOURCE_URL=https://github.com/pzarzycki/artemis-2
ARG STAR_MAP_RESOLUTIONS="4k 8k 16k"

ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_SOURCE_URL=$VITE_SOURCE_URL

RUN uv run --no-project python scripts/download_starmaps.py ${STAR_MAP_RESOLUTIONS}
RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

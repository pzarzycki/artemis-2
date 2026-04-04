FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_BASE_PATH=/artemis-2/
ARG VITE_APP_URL=https://pzarzycki.github.io/artemis-2/
ARG VITE_SOURCE_URL=https://github.com/pzarzycki/artemis-2

ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_SOURCE_URL=$VITE_SOURCE_URL

RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

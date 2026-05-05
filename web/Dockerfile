FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_SOLACE_URL
ARG VITE_SOLACE_VPN
ARG VITE_SOLACE_USER
ARG VITE_SOLACE_PASS

ENV VITE_SOLACE_URL=$VITE_SOLACE_URL
ENV VITE_SOLACE_VPN=$VITE_SOLACE_VPN
ENV VITE_SOLACE_USER=$VITE_SOLACE_USER
ENV VITE_SOLACE_PASS=$VITE_SOLACE_PASS

RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html/orbital-mesh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
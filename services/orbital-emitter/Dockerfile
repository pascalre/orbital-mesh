FROM golang:1.26.1-bookworm AS build

RUN apt-get update && apt-get install -y gcc libc6-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o main ./cmd/orbital-emitter

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home emitter \
    && mkdir /data && chown emitter /data

WORKDIR /app
COPY --from=build /app/main .

USER 10001
ENV CACHE_DIR=/data
VOLUME /data
EXPOSE 8080

CMD ["./main"]

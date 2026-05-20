BINARY_NAME=orbital-emitter
DOCKER_IMAGE=orbital-mesh/emitter

.PHONY: all build test clean lint help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build:
	GOOS=linux GOARCH=amd64 go build -o bin/$(BINARY_NAME) ./cmd/orbital-emitter

test:
	go test -v ./...

lint:
	golangci-lint run

docker-build:
	docker build -t $(DOCKER_IMAGE):latest -f deployments/Dockerfile .

tidy:
	go mod tidy
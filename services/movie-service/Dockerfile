# Use the official Golang image as the builder stage
FROM golang:1.21 AS builder

RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev

# Set the working directory inside the container
WORKDIR /app

# Copy go mod and sum files first to leverage Docker cache
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the Go application (statically compiled for Alpine)
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-extldflags=-static" -o main .

# # Use a minimal base image for the final stage
FROM alpine:latest

# Install SQLite3 dependency
RUN apk add --no-cache sqlite-libs

ENV USER_SERVICE_DNS="user-service:8080"

# Set the working directory inside the container
WORKDIR /root

# Copy the compiled binary and database file from the builder stage
COPY --from=builder /app/main .
COPY --from=builder /app/movies.db .

# Expose the necessary port
EXPOSE 8081

# Run the application
CMD ["./main"]
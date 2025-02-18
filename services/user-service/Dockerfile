# Use Eclipse Temurin JDK 21 as the base image
FROM eclipse-temurin:21-jdk AS builder

# Set the working directory inside the container
WORKDIR /app

# Install Maven
RUN apt-get update && apt-get install -y maven

# Copy the application source code into the container
COPY . .

# Build the application
RUN mvn clean package -DskipTests

# Use a minimal base image for the final container
FROM eclipse-temurin:21-jre

# Set the working directory inside the container
WORKDIR /app

# Copy only the built JAR file from the builder stage
COPY --from=builder /app/target/user-service-1.0.0.jar ./

# Expose the application port
EXPOSE 8080

# Define the command to run the application
CMD ["java", "-jar", "user-service-1.0.0.jar"]
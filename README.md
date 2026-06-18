# E-Commerce Microservices Starter

This workspace contains a starter scaffold for a small e-commerce platform with three Spring Boot microservices:

- **user-service**: user registration, authentication (JWT), profile
- **product-service**: product CRUD (sellers only)
- **media-service**: media uploads with size/type validation

## 🚀 CI/CD Pipeline Configuration (Jenkins)

The project includes a robust CI/CD pipeline automated with Jenkins to ensure continuous integration and deployment.

### Architecture Highlights

- **Infrastructure Isolation**: Jenkins is integrated into the stack while maintaining stability through service-specific deployment targeting.
- **Network Connectivity**: All services communicate over the `buy-net` bridge network.
- **Resilience**: The pipeline includes a custom **Rollback Strategy**. If a deployment fails, the pipeline automatically detects the error, restores previous stable Docker images, and restarts the services.
- **Automated Quality**: Every commit triggers a full test suite (JUnit for Backend, Karma/Jasmine for Frontend).

### 🧠 Advanced Pipeline Insights

- **Service-Level Orchestration**: To maintain Jenkins' stability, the deployment logic implements service-specific orchestration. By targeting only application services (`frontend`, `user-service`, `product-service`, `media-service`) via `docker compose`, we decouple the application lifecycle from the CI/CD controller.
- **Headless Testing**: Frontend tests utilize Puppeteer in a headless environment, requiring specific system-level dependencies inside the Dockerfile to support Chromium execution within the CI container.
- **Atomic Rollback**: The rollback strategy operates at the Docker image layer, ensuring that the transition between versions is near-instantaneous and minimizes state inconsistency for microservices.

## Requirements to run locally

- Java 17+ / OpenJDK
- Maven
- MongoDB running on localhost:27017

## Docker quick-start (optional)

I've added a `docker-compose.yml` and Dockerfiles for each backend service to make local testing easier. This will build the three Spring Boot services and bring up a MongoDB instance.

Quick run (from the repository root):

```powershell
docker-compose up --build
```

Important:

- The compose file sets example environment variables `JWT_SECRET` and `INTERNAL_TOKEN` — replace them with secure values before using in any shared environment.
- The services will be available on ports 8081 (user), 8082 (product), 8083 (media). Mongo is exposed on 27017.

See each service folder for run instructions.

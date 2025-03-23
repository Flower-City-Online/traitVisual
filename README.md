# SolarSystemOfPeople

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

---

## Solar System of People Application Setup Guide For Docker

This guide will help you run the Solar System of People application using Docker.

### Prerequisites
- Docker Desktop installed
- PowerShell (or any terminal)
- Chrome browser

### 1. Install and Launch Docker Desktop
Download and install Docker Desktop from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop).  
After installation, launch Docker Desktop from your applications.

### 2. Pull the Docker Image
Open PowerShell and run:
```
docker pull hamid6426/solar-system-of-people-new:new
```

### 3. Run the Docker Container
Execute this command in PowerShell to run the container on port 8085:
```
docker run -d -p 8085:80 hamid6426/solar-system-of-people-new:new
```

### 4. Access the Application
Open Chrome and visit:
```
http://localhost:8085
```

### 5. Verify Container Status
Check running containers with:
```
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE                                      COMMAND                  CREATED       STATUS       PORTS                  NAMES
ced43fe1517d   hamid6426/solar-system-of-people-new:new   "/docker-entrypoint.…"   2 hours ago   Up 2 hours   0.0.0.0:8085->80/tcp   loving_kare
```

### Troubleshooting
If the application doesn't load:
- Ensure Docker Desktop is running
- Verify port 8085 isn't being used by other applications
- Check container logs with 
```
docker logs [CONTAINER_ID]
```

### Stopping the Container
To stop the container when finished:
```
docker stop [CONTAINER_ID] # Replace with your actual container ID
```
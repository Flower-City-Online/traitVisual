## Log in to Docker Hub (required before pushing images)

```
docker login
```

## List all locally available Docker images

```
docker images
```

## Build the image using a specific Dockerfile

```
docker build -t solar-system-of-people -f Dockerfile
```

## Build the image using the default Dockerfile

```
docker build -t solar-system-of-people .
```

## Rename an image tag

```
docker tag hamid6426/solar-system-of-people:one hamid6426/solar-system-of-people:latest
```

## Tag a local image with your Docker Hub repository name

```
docker tag solar-system-of-people hamid6426/solar-system-of-people:latest
```

## Upload the latest image to Docker Hub

```
docker push hamid6426/solar-system-of-people:latest
```

## Rebuild the current Docker image

```
docker build
```

## Show all running containers

```
docker ps
```

## Download the latest version of the image from Docker Hub

```
docker pull hamid6426/solar-system-of-people:latest
```

```
docker stop $(docker ps -q) # Stop all running containers
docker rm $(docker ps -aq) # Remove all stopped containers
docker rmi hamid6426/solar-system-of-people:latest # Remove the local image
```

```
docker pull hamid6426/solar-system-of-people:latest # Download the latest image again
docker inspect hamid6426/solar-system-of-people:latest | grep "Id" # Check image ID to confirm it's updated
```

```
docker run -d -p 8085:80 hamid6426/solar-system-of-people:latest # Start a container from the latest image on port 8085
docker run -d -p 8085:80 hamid6426/solar-system-of-people:one # Start a container from the "one" tagged image on port 8085
```

```
http://localhost:8085
```

```
docker ps -q | ForEach-Object { docker stop $_ }
docker ps -aq | ForEach-Object { docker rm $_ }
```

```
docker build -t hamid6426/solar-system-of-people:one . # Build the image with a custom tag (useful for versioning)
```

```
docker stop $(docker ps -q) # Stop all running containers
docker rm $(docker ps -aq) # Remove all containers
docker rmi hamid6426/solar-system-of-people:latest # Remove old image
docker pull hamid6426/solar-system-of-people:latest # Pull the new image
docker inspect hamid6426/solar-system-of-people:latest | grep "Id"
docker run -d -p 8085:80 hamid6426/solar-system-of-people:latest
docker run -d -p 8085:80 hamid6426/solar-system-of-people:onE
docker tag solar-system-of-people hamid6426/solar-system-of-people:latest
http://localhost:8085
```

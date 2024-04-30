# Use a Node.js base image with a specific version
FROM node:14 as build

# Set the working directory inside the container
WORKDIR /usr/src/client

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the client-side application code to the working directory
COPY . .

# Build the React application
RUN npm run build

# Use a lightweight Node.js base image for serving the static files
FROM node:14-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the built React application from the previous stage
COPY --from=build /usr/src/client/build ./client/build

# Expose port 3000 (replace with your client's port)
EXPOSE 3000

# Command to run the client
CMD ["node", "client/build"]

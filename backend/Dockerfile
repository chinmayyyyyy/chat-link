# Use a Node.js base image with a specific version
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app 

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the server-side application code to the working directory
COPY . .

# Expose port 5000 (replace with your server's port)
EXPOSE 5000

# Command to run the server
CMD ["npm", "start"]

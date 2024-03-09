const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // Import CORS middleware

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      allowedHeaders: ['my-custom-header'],
      credentials: true
    }
  });

// Set CORS for socket.io

const socketRoomMap = new Map();


app.use(cors());
// Listen for WebSocket connections
io.on('connection', socket => {
    console.log('User connected:', socket.id);
  
    // Handle joining a room
    socket.on('joinRoom', roomId => {
      // Join the specified room
      socket.join(roomId);
      // Store the socket ID and corresponding room ID
      socketRoomMap.set(socket.id, roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });
  
    // Handle ICE candidates
    socket.on('iceCandidate', candidate => {
      const roomId = socketRoomMap.get(socket.id);
      // Broadcast ICE candidate to other peers in the same room
      socket.to(roomId).emit('iceCandidate', candidate);
      console.log(`ICE candidate forwarded in room ${roomId}:`, candidate);
    });
  
    // Handle disconnection
    socket.on('disconnect', () => {
      const roomId = socketRoomMap.get(socket.id);
      // Remove socket ID and corresponding room ID from the map
      socketRoomMap.delete(socket.id);
      console.log(`User ${socket.id} disconnected from room ${roomId}`);
    });
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

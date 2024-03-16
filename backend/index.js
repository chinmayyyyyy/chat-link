const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

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

// Array to store users
let users = [];

let rooms = {};

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
  
    // Add the user's ID to the array when they connect
    users.push(socket.id);
    if (users.length >= 2) {
      const user1Id = users.shift();
      const user2Id = users.shift();
  
      const roomId = user1Id + '-' + user2Id;
      rooms[roomId] = { users: [user1Id, user2Id], peerConnections: {} }; // Store room information
      socket.join(roomId);
      io.to(roomId).emit('roomInfo', { roomId, users: [user1Id, user2Id] }); // Emit room info to both users
    }
  
    console.log(users);
  
    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove the user from the array when they disconnect
      users = users.filter(userId => userId !== socket.id);
  
      // Find and remove the user from any rooms they were in
      Object.keys(rooms).forEach(roomId => {
        if (rooms[roomId].users.includes(socket.id)) {
          rooms[roomId].users = rooms[roomId].users.filter(userId => userId !== socket.id);
          if (rooms[roomId].users.length === 0) {
            // If the room is empty, delete it
            delete rooms[roomId];
          } else {
            // Emit updated room info to remaining users in the room
            io.to(roomId).emit('roomInfo', { roomId, users: rooms[roomId].users });
          }
        }
      });
    });
  
    // Handle ICE candidate exchange
    socket.on('ice-candidate', (data) => {
      const { candidate, targetUserId } = data;
      const roomId = Object.keys(socket.rooms)[1]; // Get the room ID (excluding the socket ID)
      const targetSocket = io.sockets.connected[targetUserId];
      if (targetSocket) {
        targetSocket.emit('ice-candidate', { candidate, senderId: socket.id });
      }
    });
  
    // Handle offer and answer exchange
    socket.on('offer', (data) => {
      const { sdp, targetUserId } = data;
      const roomId = Object.keys(socket.rooms)[1]; // Get the room ID (excluding the socket ID)
      const targetSocket = io.sockets.connected[targetUserId];
      if (targetSocket) {
        targetSocket.emit('offer', { sdp, senderId: socket.id });
      }
    });
  
    socket.on('answer', (data) => {
      const { sdp, targetUserId } = data;
      const roomId = Object.keys(socket.rooms)[1]; // Get the room ID (excluding the socket ID)
      const targetSocket = io.sockets.connected[targetUserId];
      if (targetSocket) {
        targetSocket.emit('answer', { sdp, senderId: socket.id });
      }
    });
  });
  

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

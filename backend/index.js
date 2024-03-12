
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


// Store room information
const rooms = new Map();

// Handle WebSocket connections
io.on('connection', socket => {
    console.log('User connected:', socket.id);

    // Handle joining a room
    socket.on('joinRoom', roomId => {
        socket.join(roomId);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, []);
        }
        rooms.get(roomId).push(socket.id);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Handle ICE candidates
   // Handle offer and answer messages
socket.on('offer', ({ roomId, offer }) => {
    console.log(`Received offer from ${socket.id} in room ${roomId}:`, offer);
    socket.to(roomId).emit('offer', { offer, sender: socket.id });
});

socket.on('answer', ({ roomId, answer }) => {
    console.log(`Received answer from ${socket.id} in room ${roomId}:`, answer);
    socket.to(roomId).emit('answer', { answer, sender: socket.id });
});

// Handle ICE candidates
// Handle ICE candidates
socket.on('iceCandidate', ({ roomId, candidate }) => {
    console.log(`Received ICE candidate from ${socket.id} in room ${roomId}:`, candidate);
    socket.to(roomId).emit('iceCandidate', { candidate, sender: socket.id });
});


// Handle joining a room
// socket.on('joinRoom', roomId => {
//     console.log(`User ${socket.id} joined room ${roomId}`);
//     socket.join(roomId);
//     if (!rooms.has(roomId)) {
//         rooms.set(roomId, []);
//     }
//     rooms.get(roomId).push(socket.id);
// });

// Handle disconnection
socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((participants, roomId) => {
        const index = participants.indexOf(socket.id);
        if (index !== -1) {
            participants.splice(index, 1);
            if (participants.length === 0) {
                rooms.delete(roomId);
            }
        }
    });
});

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

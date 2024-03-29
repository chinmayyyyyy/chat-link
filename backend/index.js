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
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/chatlink');

const roomSchema = new mongoose.Schema({
  roomId: String,
  users: [String], // Array of user IDs
  status : String ,
});
const Room = mongoose.model('Room', roomSchema);

io.on('connection', (socket) => {
  console.log("User Connected", socket.id);

  // Check for a room with status 'waiting'
  Room.findOne({ status: 'waiting' }).then(room => {
    if (room) {
      // If a room with status 'waiting' exists
      if (room.users.length === 1) {
        // If there is only one user in the room, change status to 'chatting'
        room.status = 'chatting';
      }
      // Add the user to the room
      room.users.push(socket.id);
      return room.save();
    } else {
      // If no room with status 'waiting' exists, create a new room with the user
      const newRoom = new Room({
        roomId: socket.id, // You can generate a unique room ID here if needed
        users: [socket.id],
        status: 'waiting'
      });
      return newRoom.save();
    }
  }).then(room => {
    console.log(`User ${socket.id} joined existing or new room ${room.roomId}`);
    // Emit an event to inform the client about the room
    io.to(socket.id).emit('joinedRoom', { roomId: room.roomId });

    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log(`User Disconnected: ${socket.id}`);
      // Remove the user from the room
      Room.findOneAndUpdate({ roomId: room.roomId }, { $pull: { users: socket.id } }, { new: true }).then(updatedRoom => {
        if (!updatedRoom) {
          console.log(`Room ${room.roomId} not found`);
          return;
        }
        console.log(`User ${socket.id} removed from room ${updatedRoom.roomId}`);
        room.status = 'waiting';
        // If no users are left in the room, delete the room
        if (updatedRoom.users.length === 0) {
          Room.findOneAndDelete({ roomId: updatedRoom.roomId }).then(() => {
            console.log(`Room ${updatedRoom.roomId} deleted`);
          }).catch(err => {
            console.error('Error deleting room:', err);
          });
        }
      }).catch(err => {
        console.error('Error removing user from room:', err);
      });
    });
  }).catch(err => {
    console.error('Error:', err);
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

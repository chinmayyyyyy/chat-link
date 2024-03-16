// socket.js
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// Event listener for connection
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

// Event listener for disconnection
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

export default socket;

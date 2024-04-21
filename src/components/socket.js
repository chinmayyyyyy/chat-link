// socket.js
import io from 'socket.io-client';

const URL = "https://chat-link-buge.onrender.com";
let socket;

// Function to create or get the existing socket instance
const getSocket = () => {
  if (!socket) {
    socket = io(URL);

    // Event listener for connection
    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    // Event listener for disconnection
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }
  
  return socket;
};

export default getSocket();

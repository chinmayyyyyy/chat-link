const express = require('express');
const http = require('http');
const { sourceMapsEnabled } = require('process');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let GLOBAL_ROOM_ID = 1;
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(user1, user2) {
        const roomId = this.generate().toString();
        this.rooms.set(roomId, {
            user1, 
            user2,
        });

        user1.socket.emit("send-offer", {
            roomId
        });

        user2.socket.emit("send-offer", {
            roomId
        });
    }
    removeUserFromRoom(user) {
        
        console.log("Remove user from room started ");
       console.log(user.socket.id);
        // Iterate through all rooms and remove the user from any room they're currently in
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.user1.socket.id === user.socket.id || room.user2.socket.id === user.socket.id) {
                // Remove the user from the room
                this.rooms.delete(roomId);
                // Notify the user about leaving the room (if needed)
                user.socket.emit("left-room");
                break; // Stop after removing the user from one room
            }
        }
    }
    
    getRoomIdByUserId(socketId) {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.user1.socket.id === socketId || room.user2.socket.id === socketId) {
                return roomId;
            }
        }
        return null; // Return null if the user is not found in any room
    }
    onOffer(roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser?.socket.emit("offer", {
            sdp,
            roomId
        });
    }
    
    onAnswer(roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;

        receivingUser?.socket.emit("answer", {
            sdp,
            roomId
        });
    }

    onIceCandidates(roomId, senderSocketid, candidate, type) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser.socket.emit("add-ice-candidate", { candidate, type });
    }

    generate() {
        return GLOBAL_ROOM_ID++;
    }
}

class UserManager {
    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
    }
    next() {
        // Check if there are enough users in the queue
        if (this.queue.length >= 2) {
            // Get the next two users from the queue
            const user1Id = this.queue.shift();
            const user2Id = this.queue.shift();
            
            // Find the user objects from their socket IDs
            const user1 = this.users.find(user => user.socket.id === user1Id);
            const user2 = this.users.find(user => user.socket.id === user2Id);
            
            // Check if both users exist
            if (user1 && user2) {
                // Remove the users from their current rooms, if any
                this.roomManager.removeUserFromRoom(user1);
                this.roomManager.removeUserFromRoom(user2);
                
                // Pair them up using Room Manager
                this.roomManager.createRoom(user1, user2);
                console.log("created room with next user");
    
                // Check if the users were previously in a room and add them back to the queue
                const roomId1 = this.roomManager.getRoomIdByUserId(user1Id);
                const roomId2 = this.roomManager.getRoomIdByUserId(user2Id);
                if (roomId1 || roomId2) {
                    this.queue.push(user1Id, user2Id);
                }
            } else {
                console.log("Not all users found in the users array.");
            }
        } else {
            console.log("Not enough users in the queue to pair up.");
        }
    }

      disconnectUserFromRoom(socketId) {
        const roomId = this.roomManager.getRoomIdByUserId(socketId);
        if (roomId) {
            const room = this.roomManager.rooms.get(roomId);
            if (room) {
                const userIndex = room.user1.socket.id === socketId ? 1 : 2;
                const otherUser = room[`user${userIndex === 1 ? 2 : 1}`];
                this.queue.push(room.user1.socket.id);
                
                // Remove the user from the room
                this.roomManager.removeUserFromRoom(this.users.find(u => u.socket.id === socketId));

                // Add the other user back to the queue
                this.queue.push(otherUser.socket.id);

                // Notify the other user about the disconnection
                otherUser.socket.emit("lobby");
            }
        }
    }
        
    addUser(name, socket) {
        this.users.push({
            name, socket
        })
        this.queue.push(socket.id);
        socket.emit("lobby");
        this.clearQueue()
        this.initHandlers(socket);
    }

    removeUser(socketId) {
        const userIndex = this.users.findIndex(x => x.socket.id === socketId);
        if (userIndex !== -1) {
            const user = this.users[userIndex];
    
            // Remove the user from the list of users
            this.users.splice(userIndex, 1);
    
            // Remove the user from the queue if they're in it
            this.queue = this.queue.filter(id => id !== socketId);
    
            // Get the roomId for the user from the RoomManager
            const roomId = this.roomManager.getRoomIdByUserId(socketId);
            
            if (roomId) {
                const room = this.roomManager.rooms.get(roomId);
                if (room) {
                    // Remove the user from the room
                    this.roomManager.removeUserFromRoom(user);
                    // Add the other user back to the queue
                    const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;

                    this.queue.push(otherUser.socket.id);
                    console.log("Length of q after removing the user " + this.queue.length)
                    otherUser.socket.emit("lobby");
                }
            }
    
            // Emit the lobby event to the reconnected user
            const reconnectedUser = this.users.find(u => u.socket.id === socketId);
            if (reconnectedUser) {
                reconnectedUser.socket.emit("lobby");
            }
        } else {
            console.log("Not user index found");
        }
    }
     
    clearQueue() {
        console.log("inside clear queues")
        console.log(this.queue.length);
        if (this.queue.length < 2) {
            return;
        }

        const id1 = this.queue.pop();
        const id2 = this.queue.pop();
        console.log("id is " + id1 + " " + id2);
        const user1 = this.users.find(x => x.socket.id === id1);
        const user2 = this.users.find(x => x.socket.id === id2);

        if (!user1 || !user2) {
            return;
        }
        console.log("creating room");

        this.roomManager.createRoom(user1, user2);
        this.clearQueue();
    }

    initHandlers(socket) {
        socket.on("offer", ({ sdp, roomId }) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        });

        socket.on("answer", ({ sdp, roomId }) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });

        socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });
    }
}


const userManager = new UserManager();

io.on('connection', (socket) => {
  console.log('a user connected');
  userManager.addUser("randomName", socket);

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
    userManager.next();
  })


  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);
  });

  // Handle sending messages
  socket.on('send-message', ({ roomId, message }) => {
    // Broadcast the message to all participants in the room
    io.to(roomId).emit('chat-message', { sender: socket.id, content: message });
  });

  
  socket.on("next", () => {
    console.log("User requested to move to the next chat partner.");

    // Find the current user
    const currentUser = userManager.users.find(user => user.socket.id === socket.id);


    if (currentUser) {
        // Find the room ID of the current user
        userManager.disconnectUserFromRoom(currentUser.socket.id);

        // Check if there are at least two users in the queue
        if (userManager.queue.length >= 1) {
            // Get the ID of the next user in the queue
            const nextUserId = userManager.queue.shift();

            // Find the user object from the socket ID
            const nextUser = userManager.users.find(user => user.socket.id === nextUserId);

            // Ensure the next user exists
            if (nextUser) {
                // Pair them up using Room Manager
                userManager.roomManager.createRoom(currentUser, nextUser);
                console.log("Created room with next user  " );
            } else {
                console.log("Next user not found.");
            }
        } else {
            console.log("Not enough users in the queue to pair up.");
        }
    } else {
        console.log("Current user not found.");
    }
});


});

server.listen(5000, () => {
    console.log('listening on *:5000');
});
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
        // Iterate through all rooms and remove the user from any room they're currently in
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.user1 === user || room.user2 === user) {
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
            
            // Remove the users from their current rooms, if any
            this.roomManager.removeUserFromRoom(user1);
            this.roomManager.removeUserFromRoom(user2);
            
            // Pair them up using Room Manager
            this.roomManager.createRoom(user1, user2);
        } else {
            console.log("Not enough users in the queue to pair up.");
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
    
            // Remove the user from any room they're in
            this.roomManager.removeUserFromRoom(user);
    
            // Get the roomId for the user from the RoomManager
            const roomId = this.roomManager.getRoomIdByUserId(socketId);
            console.log(roomId);
            if (roomId) {
                const room = this.roomManager.rooms.get(roomId);
                if (room) {
                    const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;
                    this.queue.push(otherUser.socket.id);
                    console.log("user pushed back in the queue");
                }
            }
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
  })

  socket.on("next", () => {
    console.log("User requested to move to the next chat partner.");
    userManager.roomManager.removeUserFromRoom(socket);
    userManager.queue.push(socket.id);
    userManager.next(); // Pair the user with the next available user
});
});

server.listen(5000, () => {
    console.log('listening on *:5000');
});
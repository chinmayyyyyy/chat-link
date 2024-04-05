const express = require('express');
const http = require('http');
const { sourceMapsEnabled } = require('process');
const { Server } = require('socket.io');
// const { UserManager } = require("./managers/UserManager");

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
            this.users.splice(userIndex, 1);
        }
        this.queue = this.queue.filter(x => x === socketId);
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
});

server.listen(5000, () => {
    console.log('listening on *:5000');
});


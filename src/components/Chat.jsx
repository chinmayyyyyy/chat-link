import React, { Component } from 'react';
import { io } from 'socket.io-client';

class Chat extends Component {
    constructor(props) {
        super(props);
        this.localVideoRef = React.createRef();
        this.remoteVideoRef = React.createRef();
        this.peerConnection = null;
        this.socket = io('http://localhost:5000');
        this.state = {
            roomId: '', 
        };
    }

    componentDidMount() {
        this.setupSocketIO(); 
        this.setupMediaDevices();
    }

    setupSocketIO = () => {
        // Only subscribe to socket events once
        this.socket.on('iceCandidate', ({ candidate, sender }) => {
            console.log('Received iceCandidate:', candidate); // Add this console log
            if (sender !== this.socket.id) {
                this.peerConnection.addIceCandidate(candidate);
            }
        });

        this.socket.on('offer', ({ offer, sender }) => {
            console.log('Received offer:', offer); // Add this console log
            if (sender !== this.socket.id) {
                this.peerConnection.setRemoteDescription(offer);
                this.createAnswer();
            }
        });

        this.socket.on('answer', ({ answer, sender }) => {
            console.log('Received answer:', answer); // Add this console log
            if (sender !== this.socket.id) {
                this.peerConnection.setRemoteDescription(answer);
            }
        });
    };

    setupMediaDevices = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.localVideoRef.current.srcObject = stream;
        this.setState({ roomId: 'myRoom' }); // You can generate room IDs dynamically
        this.createPeerConnection();
        this.sendOffer();
    };

    createPeerConnection = () => {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.stunprotocol.org' },
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        });

        this.peerConnection.onicecandidate = this.handleIceCandidate;
        this.peerConnection.ontrack = this.handleTrack;

        const localStream = this.localVideoRef.current.srcObject;
        localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, localStream);
        });
    };

    handleIceCandidate = event => {
        console.log('Local ICE candidate:', event.candidate); // Add this console log
        if (event.candidate) {
            this.socket.emit('iceCandidate', { candidate: event.candidate, roomId: this.state.roomId });
        }
    };
    

    handleTrack = event => {
        console.log('Received remote track:', event); // Add this console log
        this.remoteVideoRef.current.srcObject = event.streams[0];
    };

    sendOffer = async () => {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('offer', { offer, roomId: this.state.roomId });
        console.log('Sent offer:', offer); // Add this console log
    };

    createAnswer = async () => {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.socket.emit('answer', { answer, roomId: this.state.roomId });
        console.log('Sent answer:', answer); // Add this console log
    };

    render() {
        return (
            <div>
                <h1>Video Chat</h1>
                <video ref={this.localVideoRef} autoPlay playsInline muted></video>
                <video ref={this.remoteVideoRef} autoPlay playsInline></video>
            </div>
        );
    }
}

export default Chat;

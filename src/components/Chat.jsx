import React, { Component } from 'react';
import { io } from 'socket.io-client';

export default class Chat extends Component {
  constructor(props) {
    super(props);
    this.localVideoRef = React.createRef();
    this.remoteVideoRef = React.createRef();
    this.peerConnection = null;
    this.socket = io('http://localhost:5000'); // Change URL as needed
  }

  componentDidMount() {
    this.setupSocketIO();
    this.setupMediaDevices();
  }

  setupSocketIO = () => {
    this.socket.on('message', message => {
      if (message.type === 'offer') {
        this.handleOffer(message.offer);
      } else if (message.type === 'answer') {
        this.handleAnswer(message.answer);
      } else if (message.type === 'candidate') {
        this.handleCandidate(message.candidate);
      }
    });
  };

  setupMediaDevices = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        this.localVideoRef.current.srcObject = stream;
        this.localStream = stream;
        this.createPeerConnection();
        this.sendOffer();
      })
      .catch(error => {
        console.error('Error accessing media devices:', error);
      });
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

    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });
  };

  handleIceCandidate = event => {
    if (event.candidate) {
      this.sendICECandidate(event.candidate);
    }
  };

  sendICECandidate = candidate => {
    this.sendMessage({ type: 'candidate', candidate });
  };

  handleTrack = event => {
    this.remoteVideoRef.current.srcObject = event.streams[0];
  };

  sendOffer = async () => {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.sendMessage({ type: 'offer', offer });
  };

  handleOffer = async offer => {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.sendMessage({ type: 'answer', answer });
  };

  handleAnswer = async answer => {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  handleCandidate = async candidate => {
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  sendMessage = message => {
    this.socket.emit('message', message);
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

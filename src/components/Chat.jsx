import React, { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const Chat = () => {
  const socketRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const [roomInfo, setRoomInfo] = useState(null); // State to store room information

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    // Listen for 'roomInfo' event from the server
    socketRef.current.on('roomInfo', (data) => {
      setRoomInfo(data); // Update room information in state
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localVideoRef.current.srcObject = stream;

        // Create a new peer connection
        peerRef.current = new RTCPeerConnection();

        // Add the local stream to the peer connection
        stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

        // Listen for ICE candidates and send them to the other user
        peerRef.current.onicecandidate = handleICECandidateEvent;

        // Listen for remote stream and display it in the remote video element
        peerRef.current.ontrack = handleTrackEvent;

        // Emit signal to server to let others know you're ready for call
        socketRef.current.emit('join video call');
      })
      .catch(error => console.error('Error accessing media devices:', error));

    // Cleanup function
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleICECandidateEvent = (event) => {
    if (event.candidate) {
      socketRef.current.emit('ice-candidate', {
        candidate: event.candidate,
      });
    }
  };

  const handleTrackEvent = (event) => {
    remoteVideoRef.current.srcObject = event.streams[0];
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted playsInline></video>
      <video ref={remoteVideoRef} autoPlay playsInline></video>
      
      {roomInfo && (
        <div>
          <h3>Room Information</h3>
          <p>Room ID: {roomInfo.roomId}</p>
          <p>Users: {roomInfo.users.join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default Chat;

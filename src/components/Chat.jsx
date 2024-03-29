import React, { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const Chat = () => {
  const socketRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const [roomInfo, setRoomInfo] = useState(null); // State to store room information
  const [isOfferer, setIsOfferer] = useState(false); // State to determine if the user is the offerer

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    // Listen for 'roomInfo' event from the server
    socketRef.current.on('roomInfo', (data) => {
      setRoomInfo(data); // Update room information in state
      // Determine if this user is the offerer based on the room information
      setIsOfferer(data.users[0] === socketRef.current.id);
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

        // If this user is the offerer, create and send offer
        if (isOfferer) {
          createAndSendOffer();
        } else {
          // If this user is not the offerer, listen for offer from the offerer
          socketRef.current.on('offer', handleOffer);
        }
      })
      .catch(error => console.error('Error accessing media devices:', error));

    // Cleanup function
    return () => {
      socketRef.current.disconnect();
    };
  }, [isOfferer]);

  // Create and send offer
  const createAndSendOffer = async () => {
    try {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      socketRef.current.emit('offer', { sdp: peerRef.current.localDescription });
    } catch (error) {
      console.error('Error creating and sending offer:', error);
    }
  };

  // Handle offer from the offerer
  const handleOffer = async (data) => {
    try {
      await peerRef.current.setRemoteDescription(data.sdp);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socketRef.current.emit('answer', { sdp: peerRef.current.localDescription });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

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

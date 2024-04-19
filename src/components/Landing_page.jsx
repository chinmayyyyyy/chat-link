// LandingPage.jsx

import React, { useEffect, useRef, useState } from "react";
import { Chat } from "./Chat";
import NavBar from "./NavBar";
import './landingPage.css';

const LandingPage = () => {
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const videoRef = useRef(null);
    const [joined, setJoined] = useState(false);

    const getCameraStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const [audioTrack, videoTrack] = [stream.getAudioTracks()[0], stream.getVideoTracks()[0]];
            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);
            if (videoRef.current) {
                videoRef.current.srcObject = new MediaStream([videoTrack]);
                videoRef.current.play();
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
        }
    };

    useEffect(() => {
        getCameraStream();
    }, []);

    const handleJoin = () => {
        setJoined(true);
    };

    if (!joined) {
        return (
            <div className="landingContainer">
                <NavBar />
                <div className="videoContainer">
                    <h2 className="videoText">Get camera-ready and let's chat!</h2>
                    <video autoPlay height={200} ref={videoRef}></video>
                </div>
                <div className="inputContainer">
                </div>
                <button className="goButton" onClick={handleJoin}>Click here to chat</button>
            </div>
        );
    }

    return <Chat localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />;
};

export default LandingPage;

import React, { useEffect, useRef, useState } from "react";
import { Chat } from "./Chat";
import NavBar from "./NavBar";
import './landingPage.css'


export const LandingPage = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setlocalVideoTrack] = useState(null);
    const videoRef = useRef(null);

    const [joined, setJoined] = useState(false);

    const getCam = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
        if (!videoRef.current) {
            return;
        }
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();
    };

    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam();
        }
    }, [videoRef]);

    if (!joined) {
        return (
            <div className ="landingContainer">
            <NavBar/>
                <h2 className= "heroText">An Anti-Naked one to one comunication platform</h2>





                <video autoPlay height={200} ref={videoRef}></video>
                <input type="text" onChange={(e) => {               
                    setName(e.target.value);
                }} />
                <button onClick={() => {
                    setJoined(true);
                }}>Join</button>
            </div>
        );
    }

    return <Chat name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />;
};
export default LandingPage;

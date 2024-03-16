// LandingPage.js
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
// import socket from './socket'; // Import the socket module

export default class LandingPage extends Component {
  // componentWillUnmount() {
  //   // Disconnect WebSocket connection when the component unmounts
  //   socket.disconnect();
  // }

  render() {
    return (
      <div>
        <h1>Hello</h1>
        <Link to="/chat">
          <button>Start a Chat</button>
        </Link>
      </div>
    );
  }
}

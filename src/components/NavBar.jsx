import React, { Component } from 'react';
import './navBar.css'
export default class NavBar extends Component {
  render() {
    return (
      <nav className="navbar">
        <div className="navbar-logo">
          {/* Insert your logo image or text here */}
          <img src="logo.png" alt="Logo" />
          <span>ChatLink</span>
        </div>
        <ul className="navbar-nav">
          <li className="nav-item">Home</li>
          <li className="nav-item">Chat</li>
          <li className="nav-item">About us</li>
        </ul>
      </nav>
    );
  }
}

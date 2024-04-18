import React, { Component } from 'react';
import './navBar.css'
export default class NavBar extends Component {
  render() {
    return (
      <nav className="navbar">
        <div className="navbar-logo">
          {/* Insert your logo image or text here */}
          <img src="logo.png" alt="Logo" />
          <span>Product Name</span>
        </div>
        <ul className="navbar-nav">
          <li className="nav-item">Nav Item 1</li>
          <li className="nav-item">Nav Item 2</li>
          <li className="nav-item">Nav Item 3</li>
        </ul>
      </nav>
    );
  }
}

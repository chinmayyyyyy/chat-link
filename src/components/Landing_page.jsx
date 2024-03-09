// Landing_page.js
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

export default class LandingPage extends Component {
  render() {
    return (
      <div>
        <h1>hello</h1>
        <Link to="/chat">
          <button>Start a Chat</button>
        </Link>
      </div>
    );
  }
}

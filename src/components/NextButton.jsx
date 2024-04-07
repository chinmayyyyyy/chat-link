import React from "react";
import PropTypes from "prop-types";

const NextButton = ({ socket }) => {
    const handleClick = () => {
        // Emit a "next" event to inform the server that the user wants to move on to the next chat partner
        socket.emit("next");
    };

    return (
        <button onClick={handleClick}>
            Next
        </button>
    );
};

NextButton.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default NextButton;

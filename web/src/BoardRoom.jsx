import React, { useState, useEffect } from 'react';

const BoardRoom = () => {

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3012');
    ws.onopen = () => {
      console.log('successfully opened ws connection');
    };
    return () => {
      ws.close();
    };
  }, []);

  return (
    <h2>Remember to Like and Subscribe</h2>
  );
}

export default BoardRoom;
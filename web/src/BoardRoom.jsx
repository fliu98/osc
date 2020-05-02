import React, { useState, useEffect } from 'react';
import ParticipantFrame from './ParticipantFrame';

const BoardRoom = () => {
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3012');
    socket.onopen = () => {
      console.log('successfully opened ws connection');
      setWs(socket);
    };
    return () => {
      ws?.close();
    };
  }, []);

  console.log(ws);

  return ws ? (
    <>
      <ParticipantFrame
        ws={ws}
        capture
      />
      <ParticipantFrame
        ws={ws}
      />
    </>
  ) : <div>connecting...</div>;
};

export default BoardRoom;
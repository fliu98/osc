import React, { useState, useEffect } from 'react';

export const SignalContext = React.createContext();

export const SignalWrapper = ({ children }) => {

  const [ws, setWs] = useState();
  const [clientID, setClientID] = useState();

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3012');
    socket.onopen = () => {
      console.log('successfully opened ws connection');
      setWs(socket);
    };
    socket.onmessage = ({ data: raw }) => {
      const data = JSON.parse(raw);
      const { type, id } = data;
      switch(type) {
        case 0:
          // accept id assignment
          socket.send(
            JSON.stringify({
              type: 1
            }
          ));
          setClientID(id);
        default:
          break;
      }
    };
    return () => {
      ws?.close();
    };
  }, []);

  console.log(clientID);

  return ws && clientID != null ? (
    <SignalContext.Provider
      value={{
        ws,
        clientID
      }}
    >
      {children}
    </SignalContext.Provider>
  ) : (
    <h2>Connecting...</h2>
  );
};
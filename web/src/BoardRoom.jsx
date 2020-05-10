import React, { useState, useEffect } from 'react';
import ParticipantFrame from './ParticipantFrame';

const BoardRoom = () => {
  const [ws, setWs] = useState(null);
  const [myID, setMyID] = useState(null);
  const [participants, setParticipants] = useState([]);

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

  useEffect(() => {
    if (ws) {
      ws.onmessage = ({ data }) => {
        data.arrayBuffer().then((buffer) => {
          //TODO: make enums for operations & refactor
          const bArray = new Uint8Array(buffer);
          switch(bArray[0]) {
            case 0:
              // ack id offer
              setMyID(bArray[1]);
              ws.send(Uint8Array.from([1]).buffer);
            case 2:
              // update participants
              const newPartList = bArray.slice(1);
              console.log('update participants' + newPartList);
              setParticipants(newPartList);
            default:
              break
          };
        });
      };
    }
  }, [ws, myID, participants]);

  console.log(participants);

  return ws ? (
    <>
      {myID !== null && (
        <ParticipantFrame
          ws={ws}
          capture
          id={myID}
        />
      )}
      {myID !== null && Array.from(participants).filter(pid => pid !== myID).map(pid => 
        <ParticipantFrame
          key={pid}
          ws={ws}
          id={pid}
        />
      )}
    </>
  ) : <div>connecting...</div>;
};

export default BoardRoom;
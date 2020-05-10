import React, { useState, useEffect, useContext } from 'react';
import { SignalContext } from './SignalContext';

const pcConfig = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

const Room = () => {
  const [peers, setPeers] = useState({});
  const [stream, setStream] = useState();
  const { ws, clientID } = useContext(SignalContext);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    }).then((stream) => {
      setStream(stream);
      // send new participant message to server
      ws.send(
        JSON.stringify({
          type: 2,
          participantID: clientID
        })
      );
    });
  }, []);
  
  useEffect(() => {
    // send new participant message to server
    ws.onmessage = ({ data: raw }) => {
      const data = JSON.parse(raw);
      console.log('received data:');
      console.log(data);
      const { type } = data;
      switch(type) {
        case 2: {
          // new participant
          // ignore if it's myself
          const { participantID } = data;
          if (clientID !== participantID) {
            const p = new RTCPeerConnection(pcConfig);
            p.onicecandidate = ({ candidate }) => {
              console.log('asdf');
              if (candidate) {
                // send candidate info to new participant
                // opcode 3, from clientID to participant id
                ws.send(
                  JSON.stringify({
                      type: 3,
                      senderID: clientID,
                      receiverID: participantID,
                      candidate: candidate.toJSON()
                  })
                );
              }
            };
            // add local stream to p
            stream.getTracks().forEach(track => p.addTrack(track, stream));

            peers[participantID] = p;
            setPeers(peers);
          }
          break;
        }
        case 3: {
          // candidate info received
          const { senderID, candidate } = data;
          if (!(senderID in peers)) {
            // I am the new participant - every other participant is sending me candidate info
            const p = new RTCPeerConnection(pcConfig);
            p.onicecandidate = ({ candidate }) => {
              if (candidate) {
                ws.send(
                  JSON.stringify({
                      type: 3,
                      senderID: clientID,
                      receiverID: senderID,
                      candidate: candidate.toJSON()
                  })
                );
              }
            };
            stream.getTracks().forEach(track => p.addTrack(track, stream));
            p.addIceCandidate(new RTCIceCandidate(candidate));

            peers[senderID] = p;
            setPeers(peers);
          } else {
            // the new participant sent me its candidate info
            const p = peers[senderID];
            p.addIceCandidate(new RTCIceCandidate(candidate));

            // create offer
            p.createOffer(offerOptions).then((desc) => {
              p.setLocalDescription(desc);
              // send desc to remote
              // opcode 4, from clientID to senderID
              ws.send(
                JSON.stringify({
                  type: 4,
                  senderID: clientID,
                  receiverID: senderID,
                  description: desc.toJSON()
                })
              );
            });

            setPeers(peers);
          }
          break;
        }
        case 4: {
          // new participant received offer
          const { senderID, description } = data;
          const p = peers[senderID];

          p.setRemoteDescription(new RTCSessionDescription(description));

          // create answer
          p.createAnswer().then((desc) => {
            p.setLocalDescription(desc);
            // send answer to remote
            ws.send(
              JSON.stringify({
                type: 5,
                senderID: clientID,
                receiverID: senderID,
                description: desc.toJSON()
              })
            );
          });

          setPeers(peers);
          break;
        }
        case 5: {
          // new participant send me answer
          const { senderID, description } = data;
          peers[senderID].setRemoteDescription(new RTCSessionDescription(description));
          setPeers(peers);
          break;
        }
        default:
          break;
      }
    }
  }, [peers, stream]);

  return null;
}

export default Room;
import React, { useState, useEffect, useContext, useRef } from 'react';
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
  const myVideo = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    }).then((mediaStream) => {
      setStream(mediaStream);
      myVideo.current.srcObject = mediaStream;
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
    if (!stream) { return; }
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
            p.ontrack = ({ streams }) => {
              const vid = document.getElementById(participantID);
              if (vid.srcObject !== streams[0]) {
                console.log(streams[0]);
                vid.srcObject = streams[0];
              }
            }
            p.onicecandidate = ({ candidate }) => {
              console.log('onicecandidate');
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

            // create offer
            p.createOffer(offerOptions).then((desc) => {
              // send desc to remote
              // opcode 4, from clientID to senderID
              ws.send(
                JSON.stringify({
                  type: 4,
                  senderID: clientID,
                  receiverID: participantID,
                  description: desc.toJSON()
                })
              );
              // set local description,
              // triggering onicecandidate callback
              p.setLocalDescription(desc);
            });

            peers[participantID] = p;
            setPeers(Object.assign({}, peers));
          }
          break;
        }
        case 3: {
          // candidate info received
          const { senderID, candidate } = data;

          // The candidate info arrived at the new participant before the offer
          // Create the PC here.
          if (!(senderID in peers)) {
            const p = new RTCPeerConnection(pcConfig);
            p.ontrack = ({ streams }) => {
              const vid = document.getElementById(senderID);
              if (vid.srcObject !== streams[0]) {
                console.log(streams[0]);
                vid.srcObject = streams[0];
              }
            }
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
            setPeers(Object.assign({}, peers));
          } else {
            // the new participant sent me its candidate info
            const p = peers[senderID];
            p.addIceCandidate(new RTCIceCandidate(candidate));

            setPeers(Object.assign({}, peers));
          }
          break;
        }
        case 4: {
          // new participant received offer
          const { senderID, description } = data;

          // participant will probably receive the offer before
          // receiving candidate information. Create PC here.
          if (!(senderID in peers)) {
            const p = new RTCPeerConnection(pcConfig);
            p.ontrack = ({ streams }) => {
              const vid = document.getElementById(senderID);
              if (vid.srcObject !== streams[0]) {
                console.log(streams[0]);
                vid.srcObject = streams[0];
              }
            }
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
            }
            stream.getTracks().forEach(track => p.addTrack(track, stream));
            peers[senderID] = p;
          }

          // proceed to set the remote description
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

          setPeers(Object.assign({}, peers));
          break;
        }
        case 5: {
          // new participant send me answer
          const { senderID, description } = data;
          const p = peers[senderID];
          p.setRemoteDescription(new RTCSessionDescription(description));
          setPeers(Object.assign({}, peers));
          break;
        }
        default: {
          break;
        }
      }
    }
  }, [peers, stream]);

  return (
    <>
      <video
        autoPlay
        ref={myVideo}
      />
      {
        Object.keys(peers).map((pid) => 
          <video
            key={pid}
            id={pid}
            autoPlay
          />
        )
      }
    </>
  )
}

export default Room;
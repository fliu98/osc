import React, { useEffect, useRef } from 'react';

const ParticipantFrame = ({ ws, videoStream }) => {
  const videoContainer = useRef();

  useEffect(() => {
    let recorder;

    if (!videoStream) {
      navigator.mediaDevices.getUserMedia({
        video: {
          frameRate: 10
        }
      }).then((stream) => {
        videoContainer.current.srcObject = stream;
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = ({ data }) => {
          data.arrayBuffer().then((buffer) => {
            ws.send(buffer);
          });
        }
        recorder.start(1000);
      });
    }

    return () => {
      recorder?.stop();
    }
  }, []);

  return videoStream 
    ? null
    : (
      <video
        autoPlay
        ref={videoContainer}
      />
    );
}

export default ParticipantFrame;
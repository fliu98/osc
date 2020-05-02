import React, { useEffect, useRef } from 'react';

const ParticipantFrame = ({ ws, capture }) => {
  const videoContainer = useRef();

  useEffect(() => {
    let recorder;

    if (capture) {
      navigator.mediaDevices.getUserMedia({
        video: {
          frameRate: 10
        }
      }).then((stream) => {
        videoContainer.current.srcObject = stream;
        recorder = new MediaRecorder(
          stream,
          {
            mimeType: 'video/webm; codecs="vp8"'
          }
        );
        console.log(recorder.mimeType);
        recorder.ondataavailable = ({ data }) => {
          data.arrayBuffer().then((buffer) => {
            ws.send(buffer);
          });
        }
        recorder.start(1000);
      });
    } else {
      const streamSource = new MediaSource();
      videoContainer.current.src = URL.createObjectURL(streamSource);
      streamSource.onsourceopen = () => {
        const vidBuffer = streamSource.addSourceBuffer('video/webm; codecs="vp8"');
        ws.onmessage = ({ data }) => {
          data.arrayBuffer().then((buffer) => {
            vidBuffer.appendBuffer(buffer);
          });
        };
      };
    }

    return () => {
      recorder?.stop();
    };
  }, []);

  return (
      <video
        autoPlay
        ref={videoContainer}
      />
    );
};

export default ParticipantFrame;
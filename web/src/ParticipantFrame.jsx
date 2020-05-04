import React, { useEffect, useRef } from 'react';

const ParticipantFrame = ({ ws, capture, id }) => {
  const videoContainer = useRef();

  useEffect(() => {
    let recorder;

    if (capture) {
      navigator.mediaDevices.getUserMedia({
        video: {
          frameRate: 30
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
          (new Blob([Uint8Array.from([3, id]), data])).arrayBuffer().then((buffer) => {
            ws.send(buffer);
          });
        }
        recorder.start(33);
      });
    } else {
      const streamSource = new MediaSource();
      videoContainer.current.src = URL.createObjectURL(streamSource);
      streamSource.onsourceopen = () => {
        const vidBuffer = streamSource.addSourceBuffer('video/webm; codecs="vp8"');
        ws.addEventListener('message', ({ data }) => {
          data.arrayBuffer().then((buffer) => {
            const bArray = new Uint8Array(buffer);
            if (bArray[0] == 3 && bArray[1] == id) {
              const payload = bArray.subarray(2);
              vidBuffer.appendBuffer(payload.buffer.slice(payload.byteOffset, payload.byteLength + payload.byteOffset));
            }
          });
        });
      };
    }

    return () => {
      recorder?.stop();
    };
  }, []);

  return (
      <>
        <video
          autoPlay
          ref={videoContainer}
        />
      </>
    );
};

export default ParticipantFrame;
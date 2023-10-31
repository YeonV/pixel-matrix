import { useState, useRef } from 'react';
import Visualizer from './Visualizer';

const AudioDataContainer = ({ audioDeviceId, fft, bandCount, audioContext, audioData, theStream, videoDevice }:{
  audioDeviceId: string,
  fft: number,
  bandCount: number,
  audioContext: React.MutableRefObject<AudioContext | any>,
  audioData: React.MutableRefObject<AnalyserNode | null>,
  theStream: React.MutableRefObject<MediaStream | null>, 
  videoDevice: string
}) => {
  const [frequencyBandArray] = useState([...Array(bandCount).keys()]);
  const theGain = useRef<AudioParam | null>(null)

  const initializeAudioAnalyser = () => {
    getMedia(audioDeviceId).then((stream: any) => {
       
    theStream.current = stream;
      if (!audioContext.current || audioContext.current.state === 'closed') {
        return;
      }
      const source = audioContext.current.createMediaStreamSource(stream);
      const analyser = audioContext.current.createAnalyser();
      
      analyser.fftSize = fft;
      const gain = audioContext.current.createGain();
      theGain.current = gain.gain;
      source.connect(gain);
      gain.connect(analyser);
      audioData.current = analyser;
    
    });
  };

  const getFrequencyData = (styleAdjuster: any) => {
    if (!audioData.current) {
      return;
    }

    const bufferLength = audioData.current.frequencyBinCount;
    const amplitudeArray = new Uint8Array(bufferLength);

    audioData.current.getByteFrequencyData(amplitudeArray);
    styleAdjuster(amplitudeArray);
  };

  const getMedia = async (clientDevice: string) => {
    const ad = await navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        clientDevice !== null &&
          devices.find((d) => d.deviceId === clientDevice)
          ? clientDevice
          : null
      );
      if (ad) {
        console.log('Audio Device:', ad)
        if (videoDevice === 'cam') {
          await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: ad } },
            video: true,
          }).then((stream) => {
            console.log('stream cam ad', stream)
            theStream.current = stream
            return stream
          })
        } else {
          await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true,
          }).then((stream) => {
            console.log('stream ad', stream)
            theStream.current = stream
            return stream
          })
        }
      } else {
        if (videoDevice === 'cam') {
          await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          }).then((stream) => {
            console.log('stream cam', stream)
            theStream.current = stream
            return stream
          })
        } else {
          await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true,
          }).then((stream) => {
            console.log('stream', stream)
            theStream.current = stream
            return stream
          })
        }
      }
  };

  return (
    <div style={{ height: 255, position: 'relative', top: 0 }}>
      <Visualizer
        fft={fft}
        bandCount={bandCount}
        key={bandCount}
        initializeAudioAnalyser={initializeAudioAnalyser}
        audioContext={audioContext.current}
        frequencyBandArray={frequencyBandArray}
        getFrequencyData={getFrequencyData}
        refresh={() => {
          if (
            audioContext.current &&
            audioContext.current.state === 'running'
          ) {
            audioContext.current.state !== 'closed' &&
              theStream.current &&
              theStream.current.getTracks().forEach((track) => track.stop());

            audioContext.current.state !== 'closed' &&
              audioContext.current.suspend();

            audioContext.current.state !== 'closed' &&
              audioContext.current.resume();
            audioData.current = null;
          }
        }}
        stop={() => {
          if (
            audioContext.current &&
            audioContext.current.state === 'running'
          ) {
            if (theGain.current) {
              theGain.current.value = 0;
            }
            setTimeout(() => {
              if (audioContext.current) {
                audioContext.current.state !== 'closed' &&
                  theStream.current &&
                  theStream.current
                    .getTracks()
                    .forEach((track) => track.stop());

                audioContext.current.state !== 'closed' &&
                  audioContext.current.suspend();

                audioContext.current.state !== 'closed' &&
                  audioContext.current.resume();

                audioData.current = null;
              }
            }, 800);
          }
        }}
      />
    </div>
  );
};

export default AudioDataContainer;
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Cast, PlayArrow, Stop } from '@mui/icons-material';
import DropFile from './components/DropFile';
import AudioDataContainer from './AudioDataContainer';

function Content() {
  const [config, setConfig] = useState({
    fft: 256,
    size: 64,
    ip: 'ws://192.168.10.50:81',
    audioDevices: [] as MediaDeviceInfo[],
    audioDevice: null as string | null,
    videoDevice: 'screen',
  });

  const {
    fft,
    size,
    ip,
    audioDevices,
    audioDevice,
    videoDevice
  } = config;

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const vcanvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const canvas = canvasRef.current
  const ctx = canvas?.getContext('2d', { willReadFrequently: true })
  const vcanvas = vcanvasRef.current
  const vctx = vcanvas?.getContext('2d', { willReadFrequently: true })
  const video = videoRef.current

  const audioData = useRef<AnalyserNode | null>(null)
  const audioContext = useRef(new AudioContext())
  const theSource = useRef<MediaStreamAudioSourceNode | null>(null)
  const theGain = useRef<AudioParam | null>(null)
  const theStream = useRef<MediaStream | null>(null)
  const theAnalyzer = useRef<AnalyserNode | null>()

  const connect = useCallback(() => {
    const ws = new WebSocket(ip)
    ws.onopen = () => {
      console.log('connected')
    }
    ws.onclose = () => {
      console.log('disconnected')
    }
    ws.onerror = (err) => {
      console.error(err)
    }
    ws.onmessage = (msg) => {
      console.log(msg)
    }
  }, [ip])

  const checkAudio = useCallback((log = false) => {
    if (theStream.current && audioContext.current && !audioData.current && !theSource.current) {
      theSource.current = audioContext.current.createMediaStreamSource(theStream.current)
      theAnalyzer.current = audioContext.current.createAnalyser()
      theAnalyzer.current.fftSize = fft
      const gain = audioContext.current.createGain()
      theGain.current = gain.gain
      theSource.current.connect(gain)
      gain.connect(theAnalyzer.current)
      audioData.current = theAnalyzer.current
      if (log) console.log('audioData', audioData.current)
    }
  }, [fft])
  
  const handleStartCapture = async () => {
    try {
      const tempip = localStorage.getItem('ip') || 'ws://192.168.10.50:81';
      setConfig({ ...config, ip: tempip });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const ad = audioDevice !== null && devices.find((d) => d.deviceId === audioDevice) ? audioDevice : null;

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

      if (vcanvas && video) {
        checkAudio(true)
      }
      setTimeout(() => {
        console.log(video)
        if (vcanvas && video) {
          vcanvas.width = video.videoWidth
          vcanvas.height = video.videoHeight
          video.srcObject = theStream.current
          video.play()
          video.requestVideoFrameCallback(videoCB)
        }
      }, 350)
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleStopCapture = () => {
    if (video) {
      video.pause();
      video.srcObject = null;
      theStream.current?.getTracks().forEach((track) => track.stop());
    }
  };

  const convertCanvas = async (ctx: CanvasRenderingContext2D, xres: number, yres: number) => {
    const imgData = ctx.getImageData(0, 0, xres, yres)
    const pixels = imgData.data
    socketRef.current?.send(Uint8Array.of(0x00))
    const buff = new Uint8Array(xres * yres)
    for (let y = 0; y < yres; y += yres) {
      for (let i = 0; i < yres; i++) {
        for (let x = 0; x < xres; x++) {
          const a = (x + (y + i) * xres) * 4
          const c = (pixels[a + 2] >> 6) | ((pixels[a + 1] >> 5) << 2) | ((pixels[a] >> 5) << 5)
          buff[x + i * xres] = c & 255
        }
      }
      socketRef.current?.send(buff)
    }
  }
  const videoCB = () => {
    if (video && vctx && ctx && canvas) {
      const w = (video.videoWidth / video.videoHeight) * canvas.height
      vctx.drawImage(video, 0, 0)
      ctx.drawImage(video, (canvas.width - w) * 0.5, 0, w, canvas.height)
      if (audioData.current) {
        const bufferSize = audioData.current.frequencyBinCount
        const WIDTH = canvas.width

        const HEIGHT = canvas.height / 2

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(0, HEIGHT / 3, WIDTH, HEIGHT)

        const barWidth = (WIDTH / bufferSize) * 2.5
        let barHeight
        let x = 0
        const amplitudeArray = new Uint8Array(bufferSize)
        audioData.current.getByteFrequencyData(amplitudeArray)
        console.log(theAnalyzer.current, bufferSize, amplitudeArray)
        for (let i = 0; i < bufferSize; i++) {
          barHeight = amplitudeArray[i] + 20

          ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`
          ctx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2)

          x += barWidth + 1
        }
      }
    }
  }

  useEffect(() => {
    if (video && vctx && ctx && canvas) {
      convertCanvas(ctx, canvas.width, canvas.height);
      checkAudio(false);
      video.requestVideoFrameCallback(videoCB);
    }
  }, [video, vctx, ctx, canvas, checkAudio, videoCB]);

  return (
    <Card sx={{ padding: 2 }}>
      <Stack spacing={2}>
        <Stack direction='row' spacing={2}>
          <Button startIcon={<Cast />} onClick={handleStartCapture}>
            Share
          </Button>
          <Button startIcon={<Stop />} onClick={handleStopCapture}>
            Stop
          </Button>
        </Stack>
        <TextField
          select
          variant='outlined'
          label='Video Input'
          value={videoDevice}
          style={{ width: '100%', textAlign: 'left' }}
          onChange={(e) => setConfig({ ...config, videoDevice: e.target.value })}
        >
          <MenuItem value={'screen'}>Screen</MenuItem>
          <MenuItem value={'cam'}>Cam</MenuItem>
        </TextField>
        <TextField
          select
          variant='outlined'
          label='Audio Input'
          disabled={videoDevice === 'screen'}
          value={audioDevice || 'default'}
          style={{ width: '100%', textAlign: 'left' }}
          onChange={(e) => setConfig({ ...config, audioDevice: e.target.value })}
        >
          {audioDevices
            .filter((cd) => cd.kind === 'audioinput')
            .map((d, i) => (
              <MenuItem key={i} value={d.deviceId}>
                {d.label}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          type='number'
          label='FFT'
          value={fft}
          onChange={(e) => setConfig({ ...config, fft: parseInt(e.currentTarget.value) })}
        />
        <TextField
          type='number'
          label='size'
          value={size}
          onChange={(e) => setConfig({ ...config, size: parseInt(e.currentTarget.value) })}
        />
        <TextField label='IP' value={ip} onChange={(e) => setConfig({ ...config, ip: e.currentTarget.value })} />
        <Button startIcon={<PlayArrow />} onClick={connect}>
          Connect
        </Button>
        <DropFile
          onload={(img: any) => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            convertCanvas(ctx, canvas.width, canvas.height);
          }}
        />
        <video autoPlay muted hidden width={`${size}px`} height={`${size}px`} ref={videoRef}></video>
        <canvas width={`${size}px`} height={`${size}px`} hidden ref={vcanvasRef}></canvas>
        <canvas width={`${size}px`} height={`${size}px`} style={{ zoom: 1 }} ref={canvasRef}></canvas>
        <Divider />
        <Typography variant='caption'>LOGS</Typography>
        <Button onClick={() => checkAudio(true)}>AnalyserNode</Button>
        <Button onClick={() => console.log('AudioDevices:', audioDevices, 'stream:', theStream)}>
          AudioDevices
        </Button>
      </Stack>
      <AudioDataContainer videoDevice={videoDevice} audioDeviceId={audioDevice || 'default'} fft={fft} bandCount={size} audioContext={audioContext} audioData={audioData} theStream={theStream}/>

    </Card>
  );
}

export default Content;

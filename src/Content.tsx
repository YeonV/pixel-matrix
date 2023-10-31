import './App.css'
import { useCallback, useRef, useState } from 'react'
import { Button, Card, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Cast, PlayArrow, Stop } from '@mui/icons-material'
import DropFile from './components/DropFile'

function Content() {
  const [fft, setFft] = useState(1024)
  const [size, setSize] = useState(64)
  const [ip, setIp] = useState('ws://192.168.10.50:81')

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevice, setAudioDevice] = useState<any>()
  const [videoDevice, setVideoDevice] = useState('screen')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const vcanvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const canvas = canvasRef.current
  const ctx = canvas?.getContext('2d', { willReadFrequently: true })
  const vcanvas = vcanvasRef.current
  const vctx = vcanvas?.getContext('2d', { willReadFrequently: true })
  const video = videoRef.current

  const audioData = useRef<any>(null)
  const audioContext = useRef(new AudioContext())
  const theGain = useRef<any>(null)
  const theStream = useRef<any>(null)
  const theAnalyzer = useRef<any>()

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

  // const send = (val: any) => {
  //   if (
  //     socketRef.current &&
  //     socketRef.current.readyState === WebSocket.OPEN &&
  //     socketRef.current.bufferedAmount === 0
  //   ) {
  //     socketRef.current.send(val)
  //   }
  // }
  const checkAudio = (log = false) => {
    if (theStream.current && audioContext.current) {
      const source = audioContext.current.createMediaStreamSource(theStream.current)
      theAnalyzer.current = audioContext.current.createAnalyser()
      theAnalyzer.current.fftSize = fft
      const gain = audioContext.current.createGain()
      theGain.current = gain.gain
      source.connect(gain)
      gain.connect(theAnalyzer.current)
      audioData.current = theAnalyzer.current
      if (log) console.log('audioData', audioData.current)
    }
  }

  const startCapture = async () => {
    const tempip = localStorage.getItem('ip') || 'ws://192.168.10.50:81'
    setIp(tempip)

    let videoStream: MediaStream | null = null
    const ad = await navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioDevices(devices.filter((cd) => cd.kind === 'audioinput'))
      return audioDevice !== null && devices.find((d) => d.deviceId === audioDevice) ? audioDevice : null
    })

    if (ad) {
      console.log('Audio Device:', ad)
      try {
        if (videoDevice === 'cam') {
          videoStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: ad } },
            video: true,
          })
        } else {
          videoStream = await navigator.mediaDevices.getDisplayMedia({
            audio: { deviceId: { exact: ad } },
            video: true,
          })
        }
      } catch (err) {
        console.log('Error:', err)
      }
    } else {
      try {
        if (videoDevice === 'cam') {
          videoStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          })
        } else {
          videoStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true,
          })
        }
      } catch (err) {
        console.log('Error:', err)
      }
    }

    if (vcanvas && video) {
      checkAudio(true)
    }
    setTimeout(() => {
      if (vcanvas && video) {
        vcanvas.width = video.videoWidth
        vcanvas.height = video.videoHeight
        video.srcObject = videoStream
        theStream.current = videoStream
        video.play()
        video.requestVideoFrameCallback(videoCB)
      }
    }, 350)
  }

  const stopCapture = () => {
    if (video) {
      video.pause()
      video.srcObject = null
      theStream.current.getTracks().forEach((track: any) => track.stop())
    }
  }

  const convertCanvas = async (ctx: CanvasRenderingContext2D, xres: number, yres: number) => {
    // const start = performance.now()
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
    // const end = performance.now()
    // console.log(`Send payload time: ${end - start} ms`)
  }

  const videoCB = () => {
    // const startT = performance.now()
    if (video && vctx && ctx && canvas) {
      const w = (video.videoWidth / video.videoHeight) * canvas.height
      vctx.drawImage(video, 0, 0)
      ctx.drawImage(video, (canvas.width - w) * 0.5, 0, w, canvas.height)
      // ctx.font = '50px serif'
      // ctx.strokeStyle = 'white'
      // ctx.strokeText('Pixel-Matrix', 0, 150, 300)
      // ctx.fillStyle = 'red'
      // ctx.fillText('Pixel-Matrix', 0, 150)
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

      convertCanvas(ctx, canvas.width, canvas.height)
      checkAudio(false)
      video.requestVideoFrameCallback(videoCB)
    }
    // const endT = performance.now()
    // console.log(`Total ctx vctx conv time: ${endT - startT} ms`);
  }

  return (
    <Card sx={{ padding: 2 }}>
      <Stack spacing={2}>
        <Stack direction='row' spacing={2}>
          <Button startIcon={<Cast />} onClick={startCapture}>
            Share
          </Button>
          <Button startIcon={<Stop />} onClick={stopCapture}>
            Stop
          </Button>
        </Stack>
        <TextField
          select
          variant='outlined'
          label='Video Input'
          value={videoDevice}
          style={{ width: '100%', textAlign: 'left' }}
          onChange={(e) => {
            setVideoDevice(e.target.value)
          }}
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
          onChange={(e) => {
            setAudioDevice(e.target.value)
          }}
        >
          {audioDevices
            .filter((cd) => cd.kind === 'audioinput')
            .map((d, i) => (
              <MenuItem key={i} value={d.deviceId}>
                {d.label}
              </MenuItem>
            ))}
        </TextField>
        <TextField type='number' label='FFT' value={fft} onChange={(e) => setFft(parseInt(e.currentTarget.value))} />
        <TextField type='number' label='size' value={size} onChange={(e) => setSize(parseInt(e.currentTarget.value))} />
        <TextField label='IP' value={ip} onChange={(e) => setIp(e.currentTarget.value)} />
        <Button startIcon={<PlayArrow />} onClick={connect}>
          Connect
        </Button>
        <DropFile
          onload={(img: any) => {
            if (!ctx || !canvas) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            convertCanvas(ctx, canvas.width, canvas.height)
          }}
        />
        <video autoPlay muted hidden width={size + 'px'} height={size + 'px'} ref={videoRef}></video>
        <canvas width={size + 'px'} height={size + 'px'} hidden ref={vcanvasRef}></canvas>
        <canvas width={size + 'px'} height={size + 'px'} style={{ zoom: 1 }} ref={canvasRef}></canvas>
        <Divider />
        <Typography variant='caption'>LOGS</Typography>
        <Button onClick={() => checkAudio(true)}>AnalyserNode</Button>
        <Button onClick={() => console.log('AudioDevices:', audioDevices, 'stream:', theStream)}>AudioDevices</Button>
      </Stack>
    </Card>
  )
}

export default Content

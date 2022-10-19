import Peer, { MediaConnection } from 'peerjs'
import { useEffect, useState } from 'react'

export const usePeerJS = (id: string) => {
  const [peer, setPeer] = useState<Peer>()
  useEffect(() => {
    if (!id) return
    const peer = new Peer(id)
    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id)
    })
    peer.on('call', async (call) => call.answer(await getUserMedia()))
    peer.on('error', (err) => window.alert(JSON.stringify(err)))
    setPeer(peer)
    return () => {
      peer.destroy()
      setPeer(undefined)
    }
  }, [id])
  return peer
}

export const connectToNewUser = (
  peer: Peer,
  userId: string,
  stream: MediaStream,
  videoWrapper: HTMLDivElement
) => {
  const connection = peer.call(userId, stream)
  const video = document.createElement('video')
  video.muted = true
  videoWrapper.append(video)
  connection.on('stream', (userVideoStream) => {
    video.srcObject = userVideoStream
    const capture = new ImageCapture(userVideoStream.getVideoTracks()[0])
    console.log('capture', capture)

    setInterval(() => {
      capture
        .grabFrame()
        .catch((err) => console.log(err))
        .then((imageBitmap) => {
          // to base64
          console.log('now')
          if (!imageBitmap) {
            console.log('empty imageBitmap')
            return
          }
          const canvas = document.createElement('canvas')
          canvas.width = imageBitmap.width
          canvas.height = imageBitmap.height
          canvas.getContext('2d')?.drawImage(imageBitmap, 0, 0)
          const dataURL = canvas.toDataURL('image/jpeg')
          console.log('dataURL', dataURL)
        })
    }, 5000)

    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
  })
  connection.on('close', () => {
    video.srcObject = null
    video.remove()
  })
  connection.on('error', (err) => {
    console.error(err)
    window.alert(JSON.stringify(err))
  })
  return connection
}

export const closeConnection = (call: MediaConnection) => {
  call.localStream.getTracks().forEach((track) => track.stop())
  call.close()
}

export const getUserMedia = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  })
  return stream
}

export const getCapture = async (track: MediaStreamTrack): Promise<string | undefined> => {
  const capture = new ImageCapture(track)
  const imageBitmap = await capture.grabFrame()
  const canvas = document.createElement('canvas')
  canvas.width = imageBitmap.width
  canvas.height = imageBitmap.height
  canvas.getContext('2d')?.drawImage(imageBitmap, 0, 0)
  const dataURL = canvas.toDataURL('image/jpeg')
  return dataURL
}

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
    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
  })
  connection.on('close', () => {
    video.srcObject = null
    video.remove()
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

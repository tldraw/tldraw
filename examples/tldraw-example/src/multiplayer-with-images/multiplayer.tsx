/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw } from '@tldraw/tldraw'
import { RoomProvider } from './liveblocks.config'
import { useMultiplayerState } from './useMultiplayerState'
// import { initializeApp } from 'firebase/app'
// import firebaseConfig from '../firebase.config'
// import { useMemo } from 'react'
// import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const roomId = 'mp-test-images-1'

export function Multiplayer() {
  return (
    <RoomProvider id={roomId}>
      <Editor roomId={roomId} />
    </RoomProvider>
  )
}

function Editor({ roomId }: { roomId: string }) {
  const { error, ...events } = useMultiplayerState(roomId)
  // const app = useMemo(() => initializeApp(firebaseConfig), [firebaseConfig])
  // const storage = useMemo(() => getStorage(app, firebaseConfig.storageBucket), [])

  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tldraw">
      <Tldraw
        showPages={false}
        {...events}
        /**
         * Warning: Keeping images enabled for multiplayer applications
         * without providing a storage bucket based solution will cause
         * massive base64 string to be written to the liveblocks room.
         *
         * Base64 storage is enabled here for testing.
         * Use very small images only
         */
        disableAssets={false}
        // onAssetCreate={async (file: File, id: string) => {
        //   const imageRef = ref(storage, id)
        //   const snapshot = await uploadBytes(imageRef, file)
        //   const url = await getDownloadURL(snapshot.ref)
        //   return url
        // }}
        // onAssetDelete={async (id: string) => {
        //   const imageRef = ref(storage, id)
        //   await deleteObject(imageRef)
        // }}
      />
    </div>
  )
}

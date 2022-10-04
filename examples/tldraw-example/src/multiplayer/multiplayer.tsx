/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TDUserStatus, Tldraw } from '@tldraw/tldraw'
import * as React from 'react'
import { RoomProvider } from './liveblocks.config'
import { useMultiplayerState } from './useMultiplayerState'

const roomId = 'mp-test-8'

/*
This example shows how to integrate TLDraw with a multiplayer room
via LiveBlocks. You could use any other service instead—the important
part is to get data from the Tldraw app when its document changes 
and update it when the server's synchronized document changes.

Warning: Keeping images enabled for multiplayer applications
without providing a storage bucket based solution will cause
massive base64 string to be written to the multiplayer storage.
It's recommended to use a storage bucket based solution, such as
Amazon AWS S3. See the www project for our implementation.
*/

export function Multiplayer() {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        id: 'DEFAULT_ID',
        user: {
          id: 'DEFAULT_ID',
          status: TDUserStatus.Connecting,
          activeShapes: [],
          color: 'black',
          point: [0, 0],
          selectedIds: [],
        },
      }}
    >
      <Editor roomId={roomId} />
    </RoomProvider>
  )
}

function Editor({ roomId }: { roomId: string }) {
  const { error, ...events } = useMultiplayerState(roomId)
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tldraw">
      <Tldraw
        showPages={false}
        {...events}
        disableAssets={true}
        // disableAssets={false}
        // onAssetCreate={async (file: File, id: string) => {
        //   const url = await uploadToStorage(file, id)
        //   return url
        // }}
        // onAssetDelete={async (id: string) => {
        //   await delteFromStorage(id)
        //   return
        // }}/>
      />
    </div>
  )
}

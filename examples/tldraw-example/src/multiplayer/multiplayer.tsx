/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw } from '@tldraw/tldraw'
import { RoomProvider } from './liveblocks.config'
import { useMultiplayerState } from './useMultiplayerState'

const roomId = 'mp-test-8'

export function Multiplayer() {
  return (
    <RoomProvider id={roomId}>
      <Editor roomId={roomId} />
    </RoomProvider>
  )
}

function Editor({ roomId }: { roomId: string }) {
  const { error, ...events } = useMultiplayerState(roomId)
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tldraw">
      <Tldraw showPages={false} {...events} disableAssets={true} />
    </div>
  )
}

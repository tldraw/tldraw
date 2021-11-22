/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw } from '@tldraw/tldraw'
import { createClient } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider } from '@liveblocks/react'
import { useMultiplayerState } from './useMultiplayerState'

const client = createClient({
  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_API_KEY || '',
  throttle: 100,
})

const roomId = 'mp-test-7'

export function Multiplayer() {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
        <Editor roomId={roomId} />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function Editor({ roomId }: { roomId: string }) {
  const { error, loading, ...events } = useMultiplayerState(roomId)

  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tldraw">
      <Tldraw showPages={false} {...events} />
    </div>
  )
}

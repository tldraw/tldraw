/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw, TldrawApp, TDUser, TDShape } from '@tldraw/tldraw'
import { createClient, Presence } from '@liveblocks/client'
import {
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
  useMap,
  useObject,
  useBatch,
  useRedo,
  useUndo,
  useRoom,
  useOthers,
  useEventListener,
} from '@liveblocks/react'
import { Utils } from '@tldraw/core'

declare const window: Window & { app: TldrawApp }

interface TDUserPresence extends Presence {
  user: TDUser
}

const client = createClient({
  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_API_KEY || '',
  throttle: 100,
})

const roomId = 'mp-test-5'

export function Multiplayer() {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
        <Editor />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function Editor() {
  const [uuid] = React.useState(() => Utils.uniqueId())
  const [app, setApp] = React.useState<TldrawApp>()
  const [error, setError] = React.useState<Error>()

  useErrorListener((err) => setError(err))
  const lShapes = useMap<string, TDShape>('shapes')
  const lMeta = useObject('lastUserId', { lastUserId: '' })
  const undo = useUndo()
  const redo = useRedo()
  const batch = useBatch()
  const others = useOthers()

  // Put the state into the window, for debugging.
  const handleMount = React.useCallback((app: TldrawApp) => {
    app.pause()
    window.app = app
    setApp(app)
  }, [])

  // Update the live shapes when the app's shapes change.
  const handleShapesChange = React.useCallback(
    (app: TldrawApp, shapes: Record<string, TDShape | undefined>) => {
      batch(() => {
        if (!lShapes) return
        Object.entries(shapes).forEach(([id, shape]) => {
          if (!shape) {
            lShapes.delete(id)
          } else {
            lShapes.set(shape.id, shape)
          }
        })
      })
    },
    [uuid, lShapes]
  )

  // Update the app's shapes when the live shapes change.
  React.useEffect(() => {
    if (!lShapes) return
    if (!lMeta) return
    if (!app) return
    app.replacePageShapes(Object.fromEntries(lShapes.entries()))
  }, [lShapes?.values(), lShapes, lMeta, app])

  const room = useRoom()

  // Manage room events
  React.useEffect(() => {
    if (!room) return
    if (!app) return

    // Load in an empty room
    app.loadRoom(roomId)

    // When the user closes the tab, broadcast an "exit" event after exiting
    function handleExit() {
      if (!app?.room) return
      room?.broadcastEvent({ name: 'exit', userId: app.room.userId })
    }

    window.addEventListener('beforeunload', handleExit)

    return () => {
      window.removeEventListener('beforeunload', handleExit)
    }
  }, [app, roomId])

  // When the "exit" event occurs, remove the user from the room.
  useEventListener<{ name: string; userId: string }>(({ event }) => {
    if (!app) return
    if (event.name === 'exit') {
      app.removeUser(event.userId)
    }
  })

  // Handle presence updates when the user's pointer / selection changes
  const handlePresenceChange = React.useCallback(
    (app: TldrawApp, user: TDUser) => {
      const room = client.getRoom(roomId)
      room?.updatePresence({ id: app.room?.userId, user })
    },
    [roomId]
  )

  // When the other users change, update the app's users
  React.useEffect(() => {
    if (!app) return
    app.updateUsers(
      others
        .toArray()
        .filter((other) => other.presence)
        .map((other) => other.presence!.user)
        .filter(Boolean)
    )
  }, [app, others])

  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tldraw">
      <Tldraw
        onMount={handleMount}
        onChangePresence={handlePresenceChange}
        onChangeShapes={handleShapesChange}
        showPages={false}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
  )
}

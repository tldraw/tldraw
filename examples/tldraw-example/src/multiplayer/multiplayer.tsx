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
        <Editor roomId={roomId} />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function Editor({ roomId }: { roomId: string }) {
  const [uuid] = React.useState(() => Utils.uniqueId())
  const [app, setApp] = React.useState<TldrawApp>()
  const [error, setError] = React.useState<Error>()

  useErrorListener((err) => setError(err))
  const lShapes = useMap<string, TDShape>('shapes')
  const lMeta = useObject('lastUserId', { lastUserId: '' })
  const undo = useUndo()
  const redo = useRedo()
  const batch = useBatch()

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

  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tldraw">
      <Tldraw
        onMount={handleMount}
        onChangeShapes={handleShapesChange}
        showPages={false}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
  )
}

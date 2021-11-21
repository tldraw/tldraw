/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TDDocument, TldrawApp, TDUser, TDShape } from '@tldraw/tldraw'
import {
  useErrorListener,
  useMap,
  useObject,
  useBatch,
  useRedo,
  useUndo,
  useRoom,
  useOthers,
  useEventListener,
  useUpdateMyPresence,
} from '@liveblocks/react'

declare const window: Window & { app: TldrawApp }

export function useMultiplayerState(roomId: string) {
  const [app, setApp] = React.useState<TldrawApp>()
  const [error, setError] = React.useState<Error>()

  useErrorListener((err) => setError(err))
  const room = useRoom()
  const undo = useUndo()
  const redo = useRedo()
  const batch = useBatch()
  const others = useOthers()
  const updateMyPresence = useUpdateMyPresence()
  const lShapes = useMap<string, TDShape>('shapes')
  const lMeta = useObject('lastUserId', { lastUserId: '' })

  const doc = useObject<{ uuid: string; document: TDDocument }>('doc', {
    uuid: '',
    document: {
      ...TldrawApp.defaultDocument,
      id: roomId,
    },
  })

  React.useEffect(() => {
    if (!(doc && lShapes)) return
    // Migrate older documents to the new structures
    const document = doc.get('document')
    Object.values(document.pages.page.shapes).forEach((shape) => lShapes.set(shape.id, shape))

    try {
      // Now clear the document shapes so that they aren't applied again
      doc.set('document', {
        ...document,
        pages: {
          page: {
            ...document.pages.page,
            shapes: {},
          },
        },
      })
    } catch (e) {
      console.log(e)
    }
  }, [doc, lShapes])

  // Put the state into the window, for debugging.
  const onMount = React.useCallback((app: TldrawApp) => {
    app.pause()
    window.app = app
    setApp(app)
  }, [])

  // Update the live shapes when the app's shapes change.
  const onChangeShapes = React.useCallback(
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
    [batch, lShapes]
  )

  // Handle presence updates when the user's pointer / selection changes
  const onChangePresence = React.useCallback(
    (app: TldrawApp, user: TDUser) => {
      updateMyPresence({ id: app.room?.userId, user })
    },
    [updateMyPresence]
  )

  // Manage room events
  React.useEffect(() => {
    if (!room) return
    if (!app) return
    if (!room) return

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
  }, [roomId, app, room])

  // When the "exit" event occurs, remove the user from the room.
  useEventListener<{ name: string; userId: string }>(({ event }) => {
    if (!app) return
    if (event.name === 'exit') {
      app.removeUser(event.userId)
    }
  })

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

  const liveShapes = lShapes?.entries()

  // Update the app's shapes when the live shapes change.
  React.useEffect(() => {
    if (!lShapes) return
    if (!lMeta) return
    if (!app) return
    app.replacePageShapes(Object.fromEntries(liveShapes))
  }, [liveShapes, lShapes, lMeta, app])

  return {
    undo,
    redo,
    onMount,
    onChangeShapes,
    onChangePresence,
    error,
    loading: !(lShapes && lMeta && room),
  }
}

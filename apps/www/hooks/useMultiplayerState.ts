/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TldrawApp, TDUser, TDShape, TDBinding, TDDocument } from '@tldraw/tldraw'
import { useRedo, useUndo, useRoom, useUpdateMyPresence } from '@liveblocks/react'
import { LiveMap, LiveObject } from '@liveblocks/client'

declare const window: Window & { app: TldrawApp }

export function useMultiplayerState(roomId: string) {
  const [app, setApp] = React.useState<TldrawApp>()
  const [error, setError] = React.useState<Error>()
  const [loading, setLoading] = React.useState(true)
  const rExpectingUpdate = React.useRef(false)

  const room = useRoom()
  const onUndo = useUndo()
  const onRedo = useRedo()
  const updateMyPresence = useUpdateMyPresence()

  // Document Changes --------

  const rLiveShapes = React.useRef<LiveMap<string, TDShape>>()
  const rLiveBindings = React.useRef<LiveMap<string, TDBinding>>()

  React.useEffect(() => {
    const unsubs: (() => void)[] = []

    if (!(app && room)) return
    // Handle errors
    unsubs.push(room.subscribe('error', (error) => setError(error)))

    // Handle changes to other users' presence
    unsubs.push(
      room.subscribe('others', (others) => {
        app.updateUsers(
          others
            .toArray()
            .filter((other) => other.presence)
            .map((other) => other.presence!.user)
            .filter(Boolean)
        )
      })
    )

    // Handle events from the room
    unsubs.push(
      room.subscribe(
        'event',
        (e: { connectionId: number; event: { name: string; userId: string } }) => {
          switch (e.event.name) {
            case 'exit': {
              app?.removeUser(e.event.userId)
              break
            }
          }
        }
      )
    )

    // Send the exit event when the tab closes
    function handleExit() {
      if (!(room && app?.room)) return
      room?.broadcastEvent({ name: 'exit', userId: app.room.userId })
    }

    window.addEventListener('beforeunload', handleExit)
    unsubs.push(() => window.removeEventListener('beforeunload', handleExit))

    // Setup the document's storage and subscriptions
    async function setupDocument() {
      const storage = await room.getStorage<any>()

      // Initialize (get or create) shapes and bindings maps

      let lShapes: LiveMap<string, TDShape> = storage.root.get('shapes')
      if (!lShapes) {
        storage.root.set('shapes', new LiveMap<string, TDShape>())
        lShapes = storage.root.get('shapes')
      }
      rLiveShapes.current = lShapes

      let lBindings: LiveMap<string, TDBinding> = storage.root.get('bindings')
      if (!lBindings) {
        storage.root.set('bindings', new LiveMap<string, TDBinding>())
        lBindings = storage.root.get('bindings')
      }
      rLiveBindings.current = lBindings

      // Subscribe to changes
      function handleChanges() {
        if (rExpectingUpdate.current) {
          rExpectingUpdate.current = false
          return
        }

        app?.replacePageContent(
          Object.fromEntries(lShapes.entries()),
          Object.fromEntries(lBindings.entries())
        )
      }

      unsubs.push(room.subscribe(lShapes, handleChanges))
      unsubs.push(room.subscribe(lBindings, handleChanges))

      // Update the document with initial content
      handleChanges()

      // Migrate previous versions
      const version = storage.root.get('version')

      if (!version) {
        // The doc object will only be present if the document was created
        // prior to the current multiplayer implementation. At this time, the
        // document was a single LiveObject named 'doc'. If we find a doc,
        // then we need to move the shapes and bindings over to the new structures
        // and then mark the doc as migrated.
        const doc = storage.root.get('doc') as LiveObject<{
          uuid: string
          document: TDDocument
          migrated?: boolean
        }>

        // No doc? No problem. This was likely
        if (doc) {
          const {
            document: {
              pages: {
                page: { shapes, bindings },
              },
            },
          } = doc.toObject() as { document: TDDocument }

          for (const key in shapes) {
            const shape = shapes[key]
            lShapes.set(shape.id, shape)
          }

          for (const key in bindings) {
            const binding = bindings[key]
            lBindings.set(binding.id, binding)
          }
        }
      }

      // Save the version number for future migrations
      storage.root.set('version', 2)

      setLoading(false)
    }

    setupDocument()

    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [room, app])

  // Callbacks --------------

  // Put the state into the window, for debugging.
  const onMount = React.useCallback(
    (app: TldrawApp) => {
      app.loadRoom(roomId)
      app.pause() // Turn off the app's own undo / redo stack
      window.app = app
      setApp(app)
    },
    [roomId]
  )

  // Update the live shapes when the app's shapes change.
  const onChangePage = React.useCallback(
    (
      app: TldrawApp,
      shapes: Record<string, TDShape | undefined>,
      bindings: Record<string, TDBinding | undefined>
    ) => {
      room.batch(() => {
        const lShapes = rLiveShapes.current
        const lBindings = rLiveBindings.current

        if (!(lShapes && lBindings)) return

        for (const id in shapes) {
          const shape = shapes[id]
          if (!shape) {
            lShapes.delete(id)
          } else {
            lShapes.set(shape.id, shape)
          }
        }

        for (const id in bindings) {
          const binding = bindings[id]
          if (!binding) {
            lBindings.delete(id)
          } else {
            lBindings.set(binding.id, binding)
          }
        }

        rExpectingUpdate.current = true
      })
    },
    [room]
  )

  // Handle presence updates when the user's pointer / selection changes
  const onChangePresence = React.useCallback(
    (app: TldrawApp, user: TDUser) => {
      updateMyPresence({ id: app.room?.userId, user })
    },
    [updateMyPresence]
  )

  return {
    onUndo,
    onRedo,
    onMount,
    onChangePage,
    onChangePresence,
    error,
    loading,
  }
}

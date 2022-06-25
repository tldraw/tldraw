/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type { TldrawApp, TDUser, TDShape, TDBinding } from '@tldraw/tldraw'
import { LiveMap } from '@liveblocks/client'

import { useRedo, useUndo, useRoom, useUpdateMyPresence } from './liveblocks.config'
import type { Storage } from './liveblocks.config'

declare const window: Window & { app: TldrawApp }

export function useMultiplayerState(roomId: string) {
  const [app, setApp] = React.useState<TldrawApp>()
  const [error, setError] = React.useState<Error>()
  const [loading, setLoading] = React.useState(true)

  const room = useRoom()
  const onUndo = useUndo()
  const onRedo = useRedo()
  const updateMyPresence = useUpdateMyPresence()

  const rLiveShapes = React.useRef<Storage['shapes'] | undefined>()
  const rLiveBindings = React.useRef<Storage['bindings'] | undefined>()

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

        Object.entries(shapes).forEach(([id, shape]) => {
          if (!shape) {
            lShapes.delete(id)
          } else {
            lShapes.set(shape.id, shape)
          }
        })

        Object.entries(bindings).forEach(([id, binding]) => {
          if (!binding) {
            lBindings.delete(id)
          } else {
            lBindings.set(binding.id, binding)
          }
        })
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

  // Document Changes --------

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
      room.subscribe('event', (e) => {
        switch (e.event.name) {
          case 'exit': {
            app?.removeUser(e.event.userId)
            break
          }
        }
      })
    )

    // Send the exit event when the tab closes
    function handleExit() {
      if (!(room && app?.room)) return
      room?.broadcastEvent({ name: 'exit', userId: app.room.userId })
    }

    window.addEventListener('beforeunload', handleExit)
    unsubs.push(() => window.removeEventListener('beforeunload', handleExit))

    let stillAlive = true

    // Setup the document's storage and subscriptions
    async function setupDocument() {
      const storage = await room.getStorage()

      // Initialize (get or create) shapes and bindings maps

      let lShapes = storage.root.get('shapes')
      if (!lShapes) {
        storage.root.set('shapes', new LiveMap())
        lShapes = storage.root.get('shapes')
      }
      rLiveShapes.current = lShapes

      let lBindings = storage.root.get('bindings')
      if (!lBindings) {
        storage.root.set('bindings', new LiveMap())
        lBindings = storage.root.get('bindings')
      }
      rLiveBindings.current = lBindings

      // Migrate previous versions
      const version = storage.root.get('version')

      if (!version) {
        // The doc object will only be present if the document was created
        // prior to the current multiplayer implementation. At this time, the
        // document was a single LiveObject named 'doc'. If we find a doc,
        // then we need to move the shapes and bindings over to the new structures
        // and then mark the doc as migrated.
        const doc = storage.root.get('doc')

        // No doc? No problem. This was likely a newer document
        if (doc) {
          const {
            document: {
              pages: {
                page: { shapes, bindings },
              },
            },
          } = doc.toObject()

          Object.values(shapes).forEach((shape) => lShapes.set(shape.id, shape))
          Object.values(bindings).forEach((binding) => lBindings.set(binding.id, binding))
        }
      }

      // Save the version number for future migrations
      storage.root.set('version', 2)

      // Subscribe to changes
      const handleChanges = () => {
        app?.replacePageContent(
          Object.fromEntries(lShapes.entries()),
          Object.fromEntries(lBindings.entries()),
          {}
        )
      }

      if (stillAlive) {
        unsubs.push(room.subscribe(lShapes, handleChanges))

        // Update the document with initial content
        handleChanges()
        setLoading(false)
      }
    }

    setupDocument()

    return () => {
      stillAlive = false
      unsubs.forEach((unsub) => unsub())
    }
  }, [app, room])

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

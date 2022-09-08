import { LiveMap } from '@liveblocks/client'
import type { TDUser, TldrawApp } from '@tldraw/tldraw'
import React, { useCallback, useRef, useState } from 'react'
import { Storage, useRedo, useRoom, useUndo, useUpdateMyPresence } from '~utils/liveblocks'

declare const window: Window & { app: TldrawApp }

export function useReadOnlyMultiplayerState(roomId: string) {
  const [app, setApp] = useState<TldrawApp>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(true)

  const room = useRoom()
  const onUndo = useUndo()
  const onRedo = useRedo()
  const updateMyPresence = useUpdateMyPresence()

  const rIsPaused = useRef(false)

  const rLiveShapes = useRef<Storage['shapes']>()
  const rLiveBindings = useRef<Storage['bindings']>()
  const rLiveAssets = useRef<Storage['assets']>()

  // Callbacks --------------

  // Put the state into the window, for debugging.
  const onMount = useCallback(
    (app: TldrawApp) => {
      app.loadRoom(roomId)
      app.pause() // Turn off the app's own undo / redo stack
      window.app = app
      setApp(app)
    },
    [roomId]
  )

  // Handle presence updates when the user's pointer / selection changes
  const onChangePresence = useCallback(
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
      room.subscribe('others', (others, event) => {
        if (event.type === 'leave') {
          if (event.user.presence) {
            app?.removeUser(event.user.presence.id)
          }
        } else {
          app.updateUsers(
            others
              .toArray()
              .filter((other) => other.presence)
              .map((other) => other.presence!.user)
              .filter(Boolean)
          )
        }
      })
    )

    let stillAlive = true

    // Setup the document's storage and subscriptions
    async function setupDocument() {
      const storage = await room.getStorage()

      // Migrate previous versions
      const version = storage.root.get('version')

      // Initialize (get or create) maps for shapes/bindings/assets

      let lShapes = storage.root.get('shapes')
      if (!lShapes || !('_serialize' in lShapes)) {
        storage.root.set('shapes', new LiveMap())
        lShapes = storage.root.get('shapes')
      }
      rLiveShapes.current = lShapes

      let lBindings = storage.root.get('bindings')
      if (!lBindings || !('_serialize' in lBindings)) {
        storage.root.set('bindings', new LiveMap())
        lBindings = storage.root.get('bindings')
      }
      rLiveBindings.current = lBindings

      let lAssets = storage.root.get('assets')
      if (!lAssets || !('_serialize' in lAssets)) {
        storage.root.set('assets', new LiveMap())
        lAssets = storage.root.get('assets')
      }
      rLiveAssets.current = lAssets

      // Save the version number for future migrations
      storage.root.set('version', 2.1)

      // Subscribe to changes
      const handleChanges = () => {
        app?.replacePageContent(
          Object.fromEntries(lShapes.entries()),
          Object.fromEntries(lBindings.entries()),
          Object.fromEntries(lAssets.entries())
        )
      }

      if (stillAlive) {
        unsubs.push(room.subscribe(lShapes, handleChanges))

        // Update the document with initial content
        handleChanges()

        // Zoom to fit the content
        app.zoomToFit()
        if (app.zoom > 1) {
          app.resetZoom()
        }

        setLoading(false)
      }
    }

    setupDocument()

    return () => {
      stillAlive = false
      unsubs.forEach((unsub) => unsub())
    }
  }, [room, app])

  return {
    onUndo,
    onRedo,
    onMount,
    onChangePresence,
    error,
    loading,
  }
}

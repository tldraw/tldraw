/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { useState, useRef, useCallback } from 'react'
import type { TldrawApp, TDUser, TDShape, TDBinding, TDDocument, TDAsset } from '@tldraw/tldraw'
import { useRedo, useUndo, useRoom, useUpdateMyPresence } from '@liveblocks/react'
import { LiveMap, LiveObject, Lson, LsonObject } from '@liveblocks/client'

declare const window: Window & { app: TldrawApp }

type TDLsonShape = TDShape & Lson
type TDLsonBinding = TDBinding & Lson
type TDLsonAsset = TDAsset & Lson
type LsonDoc = {
  uuid: string
  document: TDDocument
  migrated?: boolean
} & LsonObject

export function useMultiplayerState(roomId: string) {
  const [app, setApp] = useState<TldrawApp>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(true)

  const room = useRoom()
  const onUndo = useUndo()
  const onRedo = useRedo()
  const updateMyPresence = useUpdateMyPresence()

  const rLiveShapes = useRef<LiveMap<string, TDLsonShape>>()
  const rLiveBindings = useRef<LiveMap<string, TDLsonBinding>>()
  const rLiveAssets = useRef<LiveMap<string, TDLsonAsset>>()

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

  // Update the live shapes when the app's shapes change.
  const onChangePage = useCallback(
    (
      app: TldrawApp,
      shapes: Record<string, TDShape | undefined>,
      bindings: Record<string, TDBinding | undefined>,
      assets: Record<string, TDAsset | undefined>
    ) => {
      room.batch(() => {
        const lShapes = rLiveShapes.current
        const lBindings = rLiveBindings.current
        const lAssets = rLiveAssets.current

        if (!(lShapes && lBindings && lAssets)) return

        Object.entries(shapes).forEach(([id, shape]) => {
          if (!shape) {
            lShapes.delete(id)
          } else {
            lShapes.set(shape.id, shape as TDLsonShape)
          }
        })

        Object.entries(bindings).forEach(([id, binding]) => {
          if (!binding) {
            lBindings.delete(id)
          } else {
            lBindings.set(binding.id, binding as TDLsonBinding)
          }
        })

        Object.entries(assets).forEach(([id, asset]) => {
          if (!asset) {
            lAssets.delete(id)
          } else {
            lAssets.set(asset.id, asset as TDLsonAsset)
          }
        })
      })
    },
    [room]
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
      room.subscribe<{ id: string; user: TDUser }>('others', (others, event) => {
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
      const storage = await room.getStorage<any>()

      // Migrate previous versions
      const version = storage.root.get('version')

      // Initialize (get or create) maps for shapes/bindings/assets

      let lShapes: LiveMap<string, TDLsonShape> = storage.root.get('shapes')
      if (!lShapes || !('_serialize' in lShapes)) {
        storage.root.set('shapes', new LiveMap<string, TDLsonShape>())
        lShapes = storage.root.get('shapes')
      }
      rLiveShapes.current = lShapes

      let lBindings: LiveMap<string, TDLsonBinding> = storage.root.get('bindings')
      if (!lBindings || !('_serialize' in lBindings)) {
        storage.root.set('bindings', new LiveMap<string, TDLsonBinding>())
        lBindings = storage.root.get('bindings')
      }
      rLiveBindings.current = lBindings

      let lAssets: LiveMap<string, TDLsonAsset> = storage.root.get('assets')
      if (!lAssets || !('_serialize' in lAssets)) {
        storage.root.set('assets', new LiveMap<string, TDLsonAsset>())
        lAssets = storage.root.get('assets')
      }
      rLiveAssets.current = lAssets

      if (!version) {
        // The doc object will only be present if the document was created
        // prior to the current multiplayer implementation. At this time, the
        // document was a single LiveObject named 'doc'. If we find a doc,
        // then we need to move the shapes and bindings over to the new structures
        // and then mark the doc as migrated.
        const doc = storage.root.get('doc') as LiveObject<LsonDoc>

        // No doc? No problem. This was likely a newer document
        if (doc) {
          const {
            document: {
              pages: {
                page: { shapes, bindings },
              },
              assets,
            },
          } = doc.toObject()

          Object.values(shapes).forEach((shape) => lShapes.set(shape.id, shape as TDLsonShape))
          Object.values(bindings).forEach((binding) =>
            lBindings.set(binding.id, binding as TDLsonBinding)
          )
          Object.values(assets).forEach((asset) => lAssets.set(asset.id, asset as TDLsonAsset))
        }
      }

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

  const onSessionStart = React.useCallback(() => {
    if (!room) return
    room.history.pause()
  }, [room])

  const onSessionEnd = React.useCallback(() => {
    if (!room) return
    room.history.resume()
  }, [room])

  return {
    onUndo,
    onRedo,
    onMount,
    onSessionStart,
    onSessionEnd,
    onChangePage,
    onChangePresence,
    error,
    loading,
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import type {
  TldrawApp,
  TDUser,
  TDShape,
  TDBinding,
  TDDocument,
  TDAsset,
  TDSnapshot,
} from '@tldraw/tldraw'
import { useRedo, useUndo, useRoom, useUpdateMyPresence } from '@liveblocks/react'
import { LiveMap, LiveObject } from '@liveblocks/client'
import { Patch } from '@tldraw/core'

declare const window: Window & { app: TldrawApp }

let i = 0

export function useMultiplayerState(roomId: string) {
  const [app, setApp] = React.useState<TldrawApp>()
  const [error, setError] = React.useState<Error>()
  const [loading, setLoading] = React.useState(true)

  const room = useRoom()
  const onUndo = useUndo()
  const onRedo = useRedo()
  const updateMyPresence = useUpdateMyPresence()

  const rLiveShapes = React.useRef<LiveMap<string, LiveObject<TDShape>>>()
  const rLiveBindings = React.useRef<LiveMap<string, LiveObject<TDBinding>>>()
  const rLiveAssets = React.useRef<LiveMap<string, LiveObject<TDAsset>>>()

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

  const updateLiveblocks = React.useCallback(
    (patch: TDSnapshot) => {
      if (!app) return

      const lBindings = rLiveBindings.current
      const lAssets = rLiveAssets.current
      const lShapes = rLiveShapes.current

      if (!lShapes) return

      const shapes = patch.document?.pages?.[app.currentPageId]?.shapes

      if (shapes) {
        for (const id in shapes) {
          i++
          // if (i > 10) return
          const lShape = lShapes.get(id)

          if (lShape) {
            const shape = shapes[id]
            if (shape) {
              lShape?.update(shapes[id])
            } else {
              lShapes.delete(id)
            }
          } else {
            const shape = app.getShape(id)
            const obj = new LiveObject(shape)
            room.subscribe(obj, (shape) => {
              app?.multiplayerPatchShapes(shape.toObject())
            })
            lShapes.set(id, obj)
          }
        }
      }
    },
    [app, room]
  )

  // Update the live shapes when the app's shapes change.
  const onPatch = React.useCallback(
    (app: TldrawApp, reason: string | undefined, patch: any) => {
      if (reason === undefined) return
      if (reason.startsWith('multiplayer')) return

      // console.log('patch', reason)

      updateLiveblocks(patch)
    },
    [updateLiveblocks]
  )

  // Update the live shapes when the app's shapes change.
  const onCommand = React.useCallback(
    (app: TldrawApp, reason: string | undefined, patch: any) => {
      if (reason === undefined) return
      if (reason.startsWith('multiplayer')) return

      // console.log('command', reason)

      updateLiveblocks(patch)
    },
    [updateLiveblocks]
  )

  // Update the live shapes when the app's shapes change.
  const onChangePage = React.useCallback(
    (
      app: TldrawApp,
      shapes: Record<string, TDShape | undefined>,
      bindings: Record<string, TDBinding | undefined>,
      assets: Record<string, TDAsset | undefined>
    ) => {
      // updateLiveblocks()
    },
    [updateLiveblocks]
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

    let stillAlive = true

    // Setup the document's storage and subscriptions
    async function setupDocument() {
      const storage = await room.getStorage<any>()

      // Initialize (get or create) shapes and bindings maps

      let lShapes: LiveMap<string, LiveObject<TDShape>> = storage.root.get('shapes')
      if (!lShapes) {
        storage.root.set('shapes', new LiveMap<string, TDShape>())
        lShapes = storage.root.get('shapes')
      }

      rLiveShapes.current = lShapes

      let lBindings: LiveMap<string, LiveObject<TDBinding>> = storage.root.get('bindings')
      if (!lBindings) {
        storage.root.set('bindings', new LiveMap<string, TDBinding>())
        lBindings = storage.root.get('bindings')
      }

      rLiveBindings.current = lBindings

      let lAssets: LiveMap<string, LiveObject<TDAsset>> = storage.root.get('assets')
      if (!lAssets) {
        storage.root.set('assets', new LiveMap<string, TDAsset>())
        lAssets = storage.root.get('assets')
      }

      rLiveAssets.current = lAssets

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

          Object.values(shapes).forEach((shape) => lShapes.set(shape.id, new LiveObject(shape)))
          Object.values(bindings).forEach((binding) =>
            lBindings.set(binding.id, new LiveObject(binding))
          )
          Object.values(assets).forEach((asset) => lAssets.set(asset.id, new LiveObject(asset)))
        }
      }

      // Save the version number for future migrations
      storage.root.set('version', 2)

      lShapes.forEach((shape) => {
        room.subscribe(shape, (shape) => {
          app?.multiplayerPatchShapes(shape.toObject())
        })
      })

      if (stillAlive) {
        unsubs.push(
          room.subscribe(lShapes, () => {
            if (!app) return

            const { shapes } = app.document.pages[app.currentPageId]

            const idsRemaining = new Set(Object.keys(shapes))

            const shapesToCreate: TDShape[] = []

            lShapes.forEach((lShape) => {
              const shape = lShape.toObject()

              if (idsRemaining.has(shape.id)) {
                // noop, this is an update
              } else {
                shapesToCreate.push(shape)
                room.subscribe(lShape, (shape) => {
                  app?.multiplayerPatchShapes(shape.toObject())
                })
              }

              idsRemaining.delete(shape.id)
            })

            console.log(idsRemaining.size)

            app.patchState({
              document: {
                pages: {
                  [app.currentPageId]: {
                    shapes: {
                      ...Object.fromEntries(shapesToCreate.map((shape) => [shape.id, shape])),
                      ...Object.fromEntries(
                        Array.from(idsRemaining.values()).map((id) => [id, undefined])
                      ),
                    },
                  },
                },
              },
            })
          })
        )

        const shapes: [string, LiveObject<TDShape>][] = Array.from(lShapes.entries())
        const shapesMap = Object.fromEntries(
          shapes.map(([id, obj]) => {
            return [id, obj.toObject()]
          })
        )

        const bindings: [string, LiveObject<TDBinding>][] = Array.from(lBindings.entries())
        const bindingsMap = Object.fromEntries(
          bindings.map(([id, obj]) => {
            return [id, obj.toObject()]
          })
        )

        const assets: [string, LiveObject<TDAsset>][] = Array.from(lAssets.entries())
        const assetsMap = Object.fromEntries(
          assets.map(([id, obj]) => {
            return [id, obj.toObject()]
          })
        )

        app?.replacePageContent(shapesMap, bindingsMap, assetsMap)

        setLoading(false)
      }
    }

    setupDocument()

    return () => {
      stillAlive = false
      unsubs.forEach((unsub) => unsub())
    }
  }, [app])

  return {
    onUndo,
    onRedo,
    onMount,
    onPatch,
    onCommand,
    // onChangePage,
    onChangePresence,
    error,
    loading,
  }
}

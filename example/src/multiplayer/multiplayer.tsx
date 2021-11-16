/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw, TldrawApp, TDDocument, TDUser } from '@tldraw/tldraw'
import { createClient, Presence } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useErrorListener, useObject } from '@liveblocks/react'
import { Utils } from '@tldraw/core'

declare const window: Window & { app: TldrawApp }

interface TDUserPresence extends Presence {
  user: TDUser
}

const client = createClient({
  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_API_KEY || '',
  throttle: 80,
})

const roomId = 'mp-test-2'

export function Multiplayer() {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
        <TldrawWrapper />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function TldrawWrapper() {
  const [docId] = React.useState(() => Utils.uniqueId())

  const [error, setError] = React.useState<Error>()

  const [app, setApp] = React.useState<TldrawApp>()

  useErrorListener((err) => setError(err))

  const doc = useObject<{ uuid: string; document: TDDocument }>('doc', {
    uuid: docId,
    document: {
      ...TldrawApp.defaultDocument,
      id: roomId,
    },
  })

  // Put the state into the window, for debugging.
  const handleMount = React.useCallback(
    (app: TldrawApp) => {
      window.app = app
      setApp(app)
    },
    [roomId]
  )

  React.useEffect(() => {
    const room = client.getRoom(roomId)

    if (!room) return
    if (!doc) return
    if (!app) return

    // Subscribe to presence changes; when others change, update the state
    room.subscribe<TDUserPresence>('others', (others) => {
      app.updateUsers(
        others
          .toArray()
          .filter((other) => other.presence)
          .map((other) => other.presence!.user)
          .filter(Boolean)
      )
    })

    room.subscribe('event', (event) => {
      if (event.event?.name === 'exit') {
        app.removeUser(event.event.userId)
      }
    })

    function handleDocumentUpdates() {
      if (!doc) return
      if (!app) return
      if (!app.room) return

      const docObject = doc.toObject()

      // Only merge the change if it caused by someone else
      if (docObject.uuid !== docId) {
        app.mergeDocument(docObject.document)
      } else {
        app.updateUsers(
          Object.values(app.room.users).map((user) => {
            return {
              ...user,
              selectedIds: user.selectedIds,
            }
          })
        )
      }
    }

    function handleExit() {
      if (!(app && app.room)) return
      room?.broadcastEvent({ name: 'exit', userId: app.room.userId })
    }

    window.addEventListener('beforeunload', handleExit)

    // When the shared document changes, update the state
    doc.subscribe(handleDocumentUpdates)

    // Load the shared document
    const newDocument = doc.toObject().document

    if (newDocument) {
      app.loadDocument(newDocument)
      app.loadRoom(roomId)

      // Update the user's presence with the user from state
      if (app.state.room) {
        const { users, userId } = app.state.room
        room.updatePresence({ id: userId, user: users[userId] })
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleExit)
      doc.unsubscribe(handleDocumentUpdates)
    }
  }, [doc, docId, app])

  const handlePersist = React.useCallback(
    (app: TldrawApp) => {
      doc?.update({ uuid: docId, document: app.document })
    },
    [docId, doc]
  )

  const handleUserChange = React.useCallback(
    (app: TldrawApp, user: TDUser) => {
      const room = client.getRoom(roomId)
      room?.updatePresence({ id: app.room?.userId, user })
    },
    [client]
  )

  if (error) return <div>Error: {error.message}</div>

  if (doc === null) return <div>Loading...</div>

  return (
    <div className="tldraw">
      <Tldraw
        onMount={handleMount}
        onPersist={handlePersist}
        onUserChange={handleUserChange}
        showPages={false}
      />
    </div>
  )
}

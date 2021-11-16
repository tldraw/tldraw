/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw, TldrawApp, TldrawDocument, TldrawUser } from '@tldraw/Tldraw'
import { createClient, Presence } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useErrorListener, useObject } from '@liveblocks/react'
import { Utils } from '@tldraw/core'

interface TldrawUserPresence extends Presence {
  user: TldrawUser
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

  const [state, setstate] = React.useState<TldrawApp>()

  useErrorListener((err) => setError(err))

  const doc = useObject<{ uuid: string; document: TldrawDocument }>('doc', {
    uuid: docId,
    document: {
      ...TldrawApp.defaultDocument,
      id: roomId,
    },
  })

  // Put the state into the window, for debugging.
  const handleMount = React.useCallback(
    (state: TldrawApp) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.state = state
      setstate(state)
    },
    [roomId]
  )

  React.useEffect(() => {
    const room = client.getRoom(roomId)

    if (!room) return
    if (!doc) return
    if (!state) return

    // Subscribe to presence changes; when others change, update the state
    room.subscribe<TldrawUserPresence>('others', (others) => {
      state.updateUsers(
        others
          .toArray()
          .filter((other) => other.presence)
          .map((other) => other.presence!.user)
          .filter(Boolean)
      )
    })

    room.subscribe('event', (event) => {
      if (event.event?.name === 'exit') {
        state.removeUser(event.event.userId)
      }
    })

    function handleDocumentUpdates() {
      if (!doc) return
      if (!state) return
      if (!state.state.room) return

      const docObject = doc.toObject()

      // Only merge the change if it caused by someone else
      if (docObject.uuid !== docId) {
        state.mergeDocument(docObject.document)
      } else {
        state.updateUsers(
          Object.values(state.state.room.users).map((user) => {
            return {
              ...user,
              selectedIds: user.selectedIds,
            }
          })
        )
      }
    }

    function handleExit() {
      if (!(state && state.state.room)) return
      room?.broadcastEvent({ name: 'exit', userId: state.state.room.userId })
    }

    window.addEventListener('beforeunload', handleExit)

    // When the shared document changes, update the state
    doc.subscribe(handleDocumentUpdates)

    // Load the shared document
    const newDocument = doc.toObject().document

    if (newDocument) {
      state.loadDocument(newDocument)
      state.loadRoom(roomId)

      // Update the user's presence with the user from state
      if (state.state.room) {
        const { users, userId } = state.state.room
        room.updatePresence({ id: userId, user: users[userId] })
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleExit)
      doc.unsubscribe(handleDocumentUpdates)
    }
  }, [doc, docId, state])

  const handlePersist = React.useCallback(
    (state: TldrawApp) => {
      doc?.update({ uuid: docId, document: state.document })
    },
    [docId, doc]
  )

  const handleUserChange = React.useCallback(
    (state: TldrawApp, user: TldrawUser) => {
      const room = client.getRoom(roomId)
      room?.updatePresence({ id: state.state.room?.userId, user })
    },
    [client]
  )

  if (error) return <div>Error: {error.message}</div>

  if (doc === null) return <div>Loading...</div>

  return (
    <div className="Tldraw">
      <Tldraw
        onMount={handleMount}
        onPersist={handlePersist}
        onUserChange={handleUserChange}
        showPages={false}
      />
    </div>
  )
}

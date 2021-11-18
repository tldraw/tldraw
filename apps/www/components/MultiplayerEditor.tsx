/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Tldraw, TldrawApp, TDDocument, TDUser, useFileSystem } from '@tldraw/tldraw'
import * as React from 'react'
import { createClient, Presence } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useObject, useErrorListener } from '@liveblocks/react'
import { Utils } from '@tldraw/core'
import { useAccountHandlers } from '-hooks/useAccountHandlers'
import { styled } from '-styles'

declare const window: Window & { app: TldrawApp }

interface TDUserPresence extends Presence {
  user: TDUser
}

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY || '',
  throttle: 80,
})

export default function MultiplayerEditor({
  roomId,
  isUser = false,
  isSponsor = false,
}: {
  roomId: string
  isUser: boolean
  isSponsor: boolean
}) {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId} defaultStorageRoot={TldrawApp.defaultDocument}>
        <Editor roomId={roomId} isSponsor={isSponsor} isUser={isUser} />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

// Inner Editor

function Editor({ roomId, isSponsor }: { roomId: string; isUser; isSponsor: boolean }) {
  const [docId] = React.useState(() => Utils.uniqueId())

  const [app, setApp] = React.useState<TldrawApp>()

  const [error, setError] = React.useState<Error>()

  useErrorListener((err) => setError(err))

  // Setup document

  const doc = useObject<{ uuid: string; document: TDDocument }>('doc', {
    uuid: docId,
    document: {
      ...TldrawApp.defaultDocument,
      id: roomId,
    },
  })

  // Put the state into the window, for debugging.
  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
    setApp(app)
  }, [])

  // Setup client

  React.useEffect(() => {
    const room = client.getRoom(roomId)

    if (!room) return
    if (!doc) return
    if (!app) return

    app.loadRoom(roomId)

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
      if (!app?.room) return

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
      if (!app?.room) return
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
  }, [doc, docId, app, roomId])

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
    [roomId]
  )

  const fileSystemEvents = useFileSystem()

  const { onSignIn, onSignOut } = useAccountHandlers()

  if (error) return <LoadingScreen>Error: {error.message}</LoadingScreen>

  if (doc === null) return <LoadingScreen>Loading...</LoadingScreen>

  return (
    <div className="tldraw">
      <Tldraw
        autofocus
        onMount={handleMount}
        onPersist={handlePersist}
        onUserChange={handleUserChange}
        showPages={false}
        showSponsorLink={isSponsor}
        onSignIn={isSponsor ? undefined : onSignIn}
        onSignOut={onSignOut}
        {...fileSystemEvents}
      />
    </div>
  )
}

const LoadingScreen = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

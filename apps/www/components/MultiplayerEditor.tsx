import { createClient } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider } from '@liveblocks/react'
import { Tldraw, TldrawApp, useFileSystem } from '@tldraw/tldraw'
import { useAccountHandlers } from 'hooks/useAccountHandlers'
import { useMultiplayerAssets } from 'hooks/useMultiplayerAssets'
import { useMultiplayerState } from 'hooks/useMultiplayerState'
import React, { FC } from 'react'
import { styled } from 'styles'

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY || '',
  throttle: 80,
})

interface Props {
  roomId: string
  isUser: boolean
  isSponsor: boolean
}

const MultiplayerEditor: FC<Props> = ({
  roomId,
  isUser = false,
  isSponsor = false,
}: {
  roomId: string
  isUser: boolean
  isSponsor: boolean
}) => {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
        <Editor roomId={roomId} isSponsor={isSponsor} isUser={isUser} />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

// Inner Editor

function Editor({ roomId, isUser, isSponsor }: Props) {
  const fileSystemEvents = useFileSystem()
  const { onSignIn, onSignOut } = useAccountHandlers()
  const { error, ...events } = useMultiplayerState(roomId)
  const { onAssetCreate, onAssetUpload, onAssetDelete } = useMultiplayerAssets()

  if (error) return <LoadingScreen>Error: {error.message}</LoadingScreen>

  return (
    <div className="tldraw">
      <Tldraw
        autofocus
        disableAssets={false}
        showPages={false}
        showSponsorLink={!isSponsor}
        onSignIn={isSponsor ? undefined : onSignIn}
        onSignOut={isUser ? onSignOut : undefined}
        onAssetCreate={onAssetCreate}
        onAssetDelete={onAssetDelete}
        onAssetUpload={onAssetUpload}
        {...fileSystemEvents}
        {...events}
      />
    </div>
  )
}

export default MultiplayerEditor

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

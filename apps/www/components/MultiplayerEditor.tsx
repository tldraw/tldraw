import { RoomProvider } from '../utils/liveblocks'
import { Tldraw, useFileSystem } from '@tldraw/tldraw'
import { useAccountHandlers } from 'hooks/useAccountHandlers'
import { useMultiplayerAssets } from 'hooks/useMultiplayerAssets'
import { useMultiplayerState } from 'hooks/useMultiplayerState'
import { useUploadAssets } from 'hooks/useUploadAssets'
import React, { FC } from 'react'
import { styled } from 'styles'

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
    <RoomProvider id={roomId}>
      <Editor roomId={roomId} isSponsor={isSponsor} isUser={isUser} />
    </RoomProvider>
  )
}

// Inner Editor

function Editor({ roomId, isUser, isSponsor }: Props) {
  const fileSystemEvents = useFileSystem()
  const { onSignIn, onSignOut } = useAccountHandlers()
  const { error, ...events } = useMultiplayerState(roomId)
  const { onAssetCreate, onAssetDelete } = useMultiplayerAssets()
  const { onAssetUpload } = useUploadAssets()

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

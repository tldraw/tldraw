import { RoomProvider } from '../utils/liveblocks'
import { Tldraw, useFileSystem } from '@tldraw/tldraw'
import { useAccountHandlers } from 'hooks/useAccountHandlers'
import { useMultiplayerAssets } from 'hooks/useMultiplayerAssets'
import { useMultiplayerState } from 'hooks/useMultiplayerState'
import { useUploadAssets } from 'hooks/useUploadAssets'
import React, { FC } from 'react'
import { styled } from 'styles'
import { useReadOnlyMultiplayerState } from 'hooks/useReadOnlyMultiplayerState'

interface Props {
  roomId: string
  isUser: boolean
  isSponsor: boolean
}

const ReadOnlyMultiplayerEditor: FC<Props> = ({
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
      <ReadOnlyEditor roomId={roomId} isSponsor={isSponsor} isUser={isUser} />
    </RoomProvider>
  )
}

// Inner Editor

function ReadOnlyEditor({ roomId, isUser, isSponsor }: Props) {
  const { onSaveProjectAs, onSaveProject } = useFileSystem()
  const { onSignIn, onSignOut } = useAccountHandlers()
  const { error, ...events } = useReadOnlyMultiplayerState(roomId)

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
        onSaveProjectAs={onSaveProjectAs}
        onSaveProject={onSaveProject}
        readOnly
        {...events}
      />
    </div>
  )
}

export default ReadOnlyMultiplayerEditor

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

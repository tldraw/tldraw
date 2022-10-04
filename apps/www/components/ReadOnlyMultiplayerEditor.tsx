import { TDUserStatus, Tldraw, useFileSystem } from '@tldraw/tldraw'
import * as React from 'react'
import { useReadOnlyMultiplayerState } from '~hooks/useReadOnlyMultiplayerState'
import { styled } from '~styles'
import { RoomProvider } from '~utils/liveblocks'

interface Props {
  roomId: string
}

const ReadOnlyMultiplayerEditor = ({ roomId }: Props) => {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        id: 'DEFAULT_ID',
        user: {
          id: 'DEFAULT_ID',
          status: TDUserStatus.Connecting,
          activeShapes: [],
          color: 'black',
          point: [0, 0],
          selectedIds: [],
        },
      }}
    >
      <ReadOnlyEditor roomId={roomId} />
    </RoomProvider>
  )
}

// Inner Editor

function ReadOnlyEditor({ roomId }: Props) {
  const { onSaveProjectAs, onSaveProject } = useFileSystem()
  const { error, ...events } = useReadOnlyMultiplayerState(roomId)

  if (error) return <LoadingScreen>Error: {error.message}</LoadingScreen>

  return (
    <div className="tldraw">
      <Tldraw
        autofocus
        disableAssets={false}
        showPages={false}
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

import { Tldraw, TldrawProps, useFileSystem } from '@tldraw/tldraw'
import * as React from 'react'
import { useMultiplayerAssets } from '~hooks/useMultiplayerAssets'
import { useMultiplayerState } from '~hooks/useMultiplayerState'
import { useUploadAssets } from '~hooks/useUploadAssets'
import { styled } from '~styles'
import { RoomProvider } from '~utils/liveblocks'

interface Props {
  roomId: string
}

const MultiplayerEditor = ({ roomId }: Props) => {
  return (
    <RoomProvider id={roomId}>
      <Editor roomId={roomId} />
    </RoomProvider>
  )
}

// Inner Editor

function Editor({ roomId }: Props) {
  const fileSystemEvents = useFileSystem()
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

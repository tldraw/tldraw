import { Tldraw, TldrawApp, TldrawProps, useFileSystem } from '@tldraw/tldraw'
import * as React from 'react'
import { useUploadAssets } from '~hooks/useUploadAssets'
import * as gtag from '~utils/gtag'

declare const window: Window & { app: TldrawApp }

interface EditorProps {
  id?: string
}

const Editor = ({ id = 'home', ...rest }: EditorProps & Partial<TldrawProps>) => {
  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
  }, [])

  // Send events to gtag as actions.
  const handlePersist = React.useCallback((_app: TldrawApp, reason?: string) => {
    gtag.event({
      action: reason ?? '',
      category: 'editor',
      label: reason ?? 'persist',
      value: 0,
    })
  }, [])

  const fileSystemEvents = useFileSystem()

  const { onAssetUpload } = useUploadAssets()

  return (
    <div className="tldraw">
      <Tldraw
        id={id}
        autofocus
        onMount={handleMount}
        onPersist={handlePersist}
        onAssetUpload={onAssetUpload}
        {...fileSystemEvents}
        {...rest}
      />
    </div>
  )
}

export default Editor

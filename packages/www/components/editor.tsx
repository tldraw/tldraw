import { TLDraw } from '@tldraw/tldraw'
import React from 'react'

interface EditorProps {
  id?: string
}

export default function Editor({ id = 'home' }: EditorProps) {
  const handleMount = React.useCallback((tlstate) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = tlstate
  }, [])

  return (
    <div className="tldraw">
      <TLDraw id={id} onMount={handleMount} />
    </div>
  )
}

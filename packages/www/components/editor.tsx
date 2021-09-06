import { TLDraw, TLDrawProps } from '@tldraw/tldraw'
import React from 'react'

interface EditorProps extends TLDrawProps {
  id?: string
}

export default function Editor({ id = 'home', onMount, ...rest }: EditorProps) {
  const handleMount = React.useCallback(
    (tlstate) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.tlstate = tlstate
      onMount?.(tlstate)
    },
    [onMount]
  )

  return <TLDraw id={id} onMount={handleMount} {...rest} />
}

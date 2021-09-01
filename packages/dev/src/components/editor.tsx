import * as React from 'react'
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

export default function Editor(): JSX.Element {
  const handleMount = React.useCallback((tlstate: TLDrawState) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = tlstate
  }, [])
  return <TLDraw id="tldraw" onMount={handleMount} />
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Renderer } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { NuPage } from './stores/NuPage'

const page = new NuPage()

export default observer(function App(): JSX.Element {
  const handlePan = React.useCallback((delta: number[]) => {
    page.panCamera(delta)
  }, [])

  return (
    <div className="tldraw">
      <Renderer page={page} onPan={handlePan} />
    </div>
  )
})

import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useContext } from '~hooks'

interface HTMLLayerProps {
  children: React.ReactNode
}

export const HTMLLayer = observer(function HTMLLayer({ children }: HTMLLayerProps) {
  const rLayer = React.useRef<HTMLDivElement>(null)

  const { viewport } = useContext()

  React.useEffect(
    () =>
      autorun(() => {
        const layer = rLayer.current
        if (!layer) return

        const { zoom, point } = viewport.camera
        layer.style.setProperty(
          'transform',
          `scale(${zoom}) translate(${point[0]}px, ${point[1]}px)`
        )
      }),
    []
  )

  return (
    <div ref={rLayer} className="nu-absolute nu-layer">
      {children}
    </div>
  )
})

import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useContext } from '~hooks'

interface SVGLayerProps {
  children: React.ReactNode
}

export const SVGLayer = observer(function SVGLayer({ children }: SVGLayerProps) {
  const rGroup = React.useRef<SVGGElement>(null)

  const { viewport } = useContext()

  React.useEffect(
    () =>
      autorun(() => {
        const group = rGroup.current
        if (!group) return

        const { zoom, point } = viewport.camera
        group.style.setProperty(
          'transform',
          `scale(${zoom}) translateX(${point[0]}px) translateY(${point[1]}px)`
        )
      }),
    []
  )

  return (
    <svg className="nu-absolute nu-overlay" pointerEvents="none">
      <g ref={rGroup} pointerEvents="none">
        {children}
      </g>
    </svg>
  )
})

import { useRef } from "react"
import state, { useSelector } from "state"
import inputs from "state/inputs"
import styled from "styles"

export default function BoundsBg() {
  const rBounds = useRef<SVGRectElement>(null)
  const bounds = useSelector((state) => state.values.selectedBounds)
  const singleSelection = useSelector((s) => {
    if (s.data.selectedIds.size === 1) {
      const selected = Array.from(s.data.selectedIds.values())[0]
      return s.data.document.pages[s.data.currentPageId].shapes[selected]
    }
  })

  if (!bounds) return null

  const { minX, minY, width, height } = bounds

  return (
    <StyledBoundsBg
      ref={rBounds}
      x={minX}
      y={minY}
      width={Math.max(1, width)}
      height={Math.max(1, height)}
      onPointerDown={(e) => {
        if (e.buttons !== 1) return
        e.stopPropagation()
        rBounds.current.setPointerCapture(e.pointerId)
        state.send("POINTED_BOUNDS", inputs.pointerDown(e, "bounds"))
      }}
      transform={
        singleSelection &&
        `rotate(${singleSelection.rotation * (180 / Math.PI)},${
          minX + width / 2
        }, ${minY + width / 2})`
      }
    />
  )
}

const StyledBoundsBg = styled("rect", {
  fill: "$boundsBg",
})

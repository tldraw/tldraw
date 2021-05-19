import { useRef } from "react"
import state, { useSelector } from "state"
import inputs from "state/inputs"
import styled from "styles"

export default function BoundsBg() {
  const rBounds = useRef<SVGRectElement>(null)
  const bounds = useSelector((state) => state.values.selectedBounds)
  const isSelecting = useSelector((s) => s.isIn("selecting"))
  const rotation = useSelector((s) => {
    if (s.data.selectedIds.size === 1) {
      const { shapes } = s.data.document.pages[s.data.currentPageId]
      const selected = Array.from(s.data.selectedIds.values())[0]
      return shapes[selected].rotation
    } else {
      return 0
    }
  })

  if (!bounds) return null
  if (!isSelecting) return null

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
      transform={`rotate(${rotation * (180 / Math.PI)},${minX + width / 2}, ${
        minY + height / 2
      })`}
    />
  )
}

const StyledBoundsBg = styled("rect", {
  fill: "$boundsBg",
})

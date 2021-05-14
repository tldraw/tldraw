import { useRef } from "react"
import state, { useSelector } from "state"
import inputs from "state/inputs"
import styled from "styles"

export default function BoundsBg() {
  const rBounds = useRef<SVGRectElement>(null)
  const bounds = useSelector((state) => state.values.selectedBounds)

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
    />
  )
}

const StyledBoundsBg = styled("rect", {
  fill: "$boundsBg",
})

import state, { useSelector } from "state"
import styled from "styles"

export default function BoundsBg() {
  const bounds = useSelector((state) => state.values.selectedBounds)

  if (!bounds) return null

  const { minX, minY, width, height } = bounds

  return (
    <StyledBoundsBg
      x={minX}
      y={minY}
      width={width}
      height={height}
      onPointerDown={(e) => {
        if (e.buttons !== 1) return
        state.send("POINTED_BOUNDS", {
          shiftKey: e.shiftKey,
          optionKey: e.altKey,
          metaKey: e.metaKey || e.ctrlKey,
          ctrlKey: e.ctrlKey,
          buttons: e.buttons,
        })
      }}
    />
  )
}

const StyledBoundsBg = styled("rect", {
  fill: "$boundsBg",
})

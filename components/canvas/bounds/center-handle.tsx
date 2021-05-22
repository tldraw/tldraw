import styled from "styles"
import { Bounds } from "types"

export default function CenterHandle({ bounds }: { bounds: Bounds }) {
  return (
    <StyledBounds
      width={bounds.width}
      height={bounds.height}
      pointerEvents="none"
    />
  )
}

const StyledBounds = styled("rect", {
  fill: "none",
  stroke: "$bounds",
  zStrokeWidth: 2,
})

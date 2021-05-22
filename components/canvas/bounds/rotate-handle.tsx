import useHandleEvents from "hooks/useBoundsHandleEvents"
import styled from "styles"
import { Bounds } from "types"

export default function Rotate({
  bounds,
  size,
}: {
  bounds: Bounds
  size: number
}) {
  const events = useHandleEvents("rotate")

  return (
    <StyledRotateHandle
      cursor="grab"
      cx={bounds.width / 2}
      cy={size * -2}
      r={size / 2}
      {...events}
    />
  )
}

const StyledRotateHandle = styled("circle", {
  stroke: "$bounds",
  fill: "#fff",
  zStrokeWidth: 2,
  cursor: "grab",
})

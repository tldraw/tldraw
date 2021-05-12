import { RectangleShape, ShapeProps } from "types"
import { HoverIndicator, Indicator } from "./indicator"
import ShapeGroup from "./shape-group"

function BaseRectangle({
  size,
  fill = "#999",
  stroke = "none",
  strokeWidth = 0,
}: ShapeProps<RectangleShape>) {
  return (
    <>
      <HoverIndicator as="rect" width={size[0]} height={size[1]} />
      <rect
        width={size[0]}
        height={size[1]}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <Indicator as="rect" width={size[0]} height={size[1]} />
    </>
  )
}

export default function Rectangle({ id, point, size }: RectangleShape) {
  return (
    <ShapeGroup id={id} point={point}>
      <BaseRectangle size={size} />
    </ShapeGroup>
  )
}

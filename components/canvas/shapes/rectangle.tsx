import { RectangleShape, ShapeProps } from "types"
import { HoverIndicator, Indicator } from "./indicator"
import ShapeGroup from "./shape-g"

function BaseRectangle({
  size,
  fill = "#999",
  stroke = "none",
  strokeWidth = 0,
}: ShapeProps<RectangleShape>) {
  return (
    <>
      <HoverIndicator
        as="rect"
        x={1}
        y={1}
        width={size[0] - 2}
        height={size[1] - 2}
      />
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={size[0] - strokeWidth}
        height={size[1] - strokeWidth}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <Indicator
        as="rect"
        x={1}
        y={1}
        width={size[0] - 2}
        height={size[1] - 2}
      />
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

import { Indicator, HoverIndicator } from "./indicator"
import { DotShape, ShapeProps } from "types"
import ShapeGroup from "./shape-g"

const dotRadius = 4

function BaseDot({
  fill = "#999",
  stroke = "none",
  strokeWidth = 1,
}: ShapeProps<DotShape>) {
  return (
    <>
      <HoverIndicator
        as="circle"
        cx={dotRadius}
        cy={dotRadius}
        r={dotRadius - 1}
      />
      <circle
        cx={dotRadius}
        cy={dotRadius}
        r={dotRadius - strokeWidth / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <Indicator as="circle" cx={dotRadius} cy={dotRadius} r={dotRadius - 1} />
    </>
  )
}

export default function Dot({ id, point }: DotShape) {
  return (
    <ShapeGroup id={id} point={point}>
      <BaseDot />
    </ShapeGroup>
  )
}

import { useSelector } from "state"
import { DotShape } from "types"
import ShapeGroup from "./shape-g"

interface BaseCircleProps {
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BaseDot({
  fill = "#ccc",
  stroke = "none",
  strokeWidth = 0,
}: BaseCircleProps) {
  return (
    <>
      <circle
        cx={strokeWidth}
        cy={strokeWidth}
        r={8}
        fill="transparent"
        stroke="none"
        strokeWidth="0"
      />
      <circle
        cx={strokeWidth}
        cy={strokeWidth}
        r={Math.max(1, 4 - strokeWidth)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </>
  )
}

export default function Dot({ id, point }: DotShape) {
  const isSelected = useSelector((state) => state.values.selectedIds.has(id))
  return (
    <ShapeGroup id={id} point={point}>
      <BaseDot />
      {isSelected && <BaseDot fill="none" stroke="blue" strokeWidth={1} />}
    </ShapeGroup>
  )
}

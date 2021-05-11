import { useSelector } from "state"
import { RectangleShape } from "types"
import ShapeGroup from "./shape-group"

interface BaseRectangleProps {
  point: number[]
  size: number[]
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BaseRectangle({
  point,
  size,
  fill = "#ccc",
  stroke = "none",
  strokeWidth = 0,
}: BaseRectangleProps) {
  return (
    <rect
      x={point[0] + strokeWidth}
      y={point[1] + strokeWidth}
      width={size[0] - strokeWidth * 2}
      height={size[1] - strokeWidth * 2}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  )
}

export default function Rectangle({ id, point, size }: RectangleShape) {
  const isSelected = useSelector((state) => state.values.selectedIds.has(id))
  return (
    <ShapeGroup id={id}>
      <BaseRectangle point={point} size={size} />
      {isSelected && (
        <BaseRectangle
          point={point}
          size={size}
          fill="none"
          stroke="blue"
          strokeWidth={1}
        />
      )}
    </ShapeGroup>
  )
}

import { useSelector } from "state"
import { RectangleShape } from "types"
import ShapeGroup from "./shape-g"

interface BaseRectangleProps extends Pick<RectangleShape, "size"> {
  size: number[]
  fill?: string
  stroke?: string
  strokeWidth?: number
}

function BaseRectangle({
  size,
  fill = "#ccc",
  stroke = "none",
  strokeWidth = 0,
}: BaseRectangleProps) {
  return (
    <rect
      x={strokeWidth}
      y={strokeWidth}
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
    <ShapeGroup id={id} point={point}>
      <BaseRectangle size={size} />
      {isSelected && (
        <BaseRectangle size={size} fill="none" stroke="blue" strokeWidth={1} />
      )}
    </ShapeGroup>
  )
}

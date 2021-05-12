import { useSelector } from "state"
import { RectangleShape, ShapeProps } from "types"
import ShapeGroup from "./shape-g"

function BaseRectangle({
  size,
  fill = "#999",
  stroke = "none",
  strokeWidth = 0,
}: ShapeProps<RectangleShape>) {
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

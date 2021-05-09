import { RectangleShape } from "types"

export default function Rectangle({ point, size }: RectangleShape) {
  return (
    <rect
      x={point[0]}
      y={point[1]}
      width={size[0]}
      height={size[1]}
      fill="black"
    />
  )
}

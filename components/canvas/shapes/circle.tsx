import { CircleShape } from "types"

export default function Circle({ point, radius }: CircleShape) {
  return <circle cx={point[0]} cy={point[1]} r={radius} fill="black" />
}

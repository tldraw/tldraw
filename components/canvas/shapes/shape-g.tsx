import state from "state"
import React, { useCallback, useRef } from "react"
import { getPointerEventInfo } from "utils/utils"

export default function ShapeGroup({
  id,
  children,
  point,
}: {
  id: string
  children: React.ReactNode
  point: number[]
}) {
  const rGroup = useRef<SVGGElement>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      rGroup.current.setPointerCapture(e.pointerId)
      state.send("POINTED_SHAPE", { id, ...getPointerEventInfo(e) })
    },
    [id]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      rGroup.current.releasePointerCapture(e.pointerId)
      state.send("STOPPED_POINTING_SHAPE", { id, ...getPointerEventInfo(e) })
    },
    [id]
  )

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) =>
      state.send("HOVERED_SHAPE", { id, ...getPointerEventInfo(e) }),
    [id]
  )

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) =>
      state.send("UNHOVERED_SHAPE", { id, ...getPointerEventInfo(e) }),
    [id]
  )

  return (
    <g
      ref={rGroup}
      transform={`translate(${point})`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </g>
  )
}

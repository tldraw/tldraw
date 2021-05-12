import state, { useSelector } from "state"
import React, { useCallback, useRef } from "react"
import { getPointerEventInfo } from "utils/utils"
import { Indicator, HoverIndicator } from "./indicator"
import styled from "styles"

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
  const isSelected = useSelector((state) => state.values.selectedIds.has(id))

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
    <StyledGroup
      ref={rGroup}
      isSelected={isSelected}
      transform={`translate(${point})`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </StyledGroup>
  )
}

const StyledGroup = styled("g", {
  [`& ${HoverIndicator}`]: {
    opacity: "0",
  },
  variants: {
    isSelected: {
      true: {
        [`& ${Indicator}`]: {
          stroke: "$selected",
        },
        [`&:hover ${HoverIndicator}`]: {
          opacity: "1",
          stroke: "$hint",
        },
      },
      false: {
        [`&:hover ${HoverIndicator}`]: {
          opacity: "1",
          stroke: "$hint",
        },
      },
    },
  },
})

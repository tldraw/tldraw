import React, { useCallback, useRef } from "react"
import state, { useSelector } from "state"
import styled from "styles"
import { getPointerEventInfo } from "utils/utils"
import { memo } from "react"
import Shapes from "lib/shapes"

/*
Gets the shape from the current page's shapes, using the
provided ID. Depending on the shape's type, return the
component for that type.

This component takes an SVG shape as its children. It handles
events for the shape as well as provides indicators for hover
 and selected status
*/

function Shape({ id }: { id: string }) {
  const rGroup = useRef<SVGGElement>(null)

  const shape = useSelector((state) => {
    const { currentPageId, document } = state.data
    return document.pages[currentPageId].shapes[id]
  })

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
      transform={`translate(${shape.point})`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <defs>
        {Shapes[shape.type] ? Shapes[shape.type].render(shape) : null}
      </defs>
      <HoverIndicator as="use" xlinkHref={"#" + id} />
      <use xlinkHref={"#" + id} {...shape.style} />
      <Indicator as="use" xlinkHref={"#" + id} />
    </StyledGroup>
  )
}

const Indicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  strokeWidth: "max(1, calc(2 / var(--camera-zoom)))",
  pointerEvents: "none",
  strokeLineCap: "round",
  strokeLinejoin: "round",
})

const HoverIndicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  strokeWidth: "max(1, calc(8 / var(--camera-zoom)))",
  pointerEvents: "all",
  strokeLinecap: "round",
  strokeLinejoin: "round",
})

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

export { Indicator, HoverIndicator }

export default memo(Shape)

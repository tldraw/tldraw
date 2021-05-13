import React, { useCallback, useRef, memo } from "react"
import state, { useSelector } from "state"
import inputs from "state/inputs"
import shapes from "lib/shapes"
import styled from "styles"

function Shape({ id }: { id: string }) {
  const rGroup = useRef<SVGGElement>(null)

  const shape = useSelector(
    ({ data: { currentPageId, document } }) =>
      document.pages[currentPageId].shapes[id]
  )

  const isSelected = useSelector((state) => state.values.selectedIds.has(id))

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      rGroup.current.setPointerCapture(e.pointerId)
      state.send("POINTED_SHAPE", inputs.pointerDown(e, id))
    },
    [id]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      rGroup.current.releasePointerCapture(e.pointerId)
      state.send("STOPPED_POINTING", inputs.pointerUp(e))
    },
    [id]
  )

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => state.send("HOVERED_SHAPE", { id }),
    [id]
  )

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => state.send("UNHOVERED_SHAPE", { id }),
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
        {shapes[shape.type] ? shapes[shape.type].render(shape) : null}
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
  zStrokeWidth: 1,
  pointerEvents: "none",
  strokeLineCap: "round",
  strokeLinejoin: "round",
})

const HoverIndicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  zStrokeWidth: [8, 4],
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

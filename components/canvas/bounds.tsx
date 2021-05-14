import state, { useSelector } from "state"
import styled from "styles"
import inputs from "state/inputs"
import { useRef } from "react"
import { TransformCorner, TransformEdge } from "types"

export default function Bounds() {
  const zoom = useSelector((state) => state.data.camera.zoom)
  const bounds = useSelector((state) => state.values.selectedBounds)
  const isBrushing = useSelector((state) => state.isIn("brushSelecting"))

  if (!bounds) return null

  const { minX, minY, maxX, maxY, width, height } = bounds

  const p = 4 / zoom
  const cp = p * 2

  if (width < p || height < p) return null

  return (
    <g pointerEvents={isBrushing ? "none" : "all"}>
      <StyledBounds
        x={minX}
        y={minY}
        width={width}
        height={height}
        pointerEvents="none"
      />
      {width * zoom > 8 && height * zoom > 8 && (
        <>
          <EdgeHorizontal
            x={minX + p}
            y={minY}
            width={Math.max(0, width - p * 2)}
            height={p}
            edge={TransformEdge.Top}
          />
          <EdgeVertical
            x={maxX}
            y={minY + p}
            width={p}
            height={Math.max(0, height - p * 2)}
            edge={TransformEdge.Right}
          />
          <EdgeHorizontal
            x={minX + p}
            y={maxY}
            width={Math.max(0, width - p * 2)}
            height={p}
            edge={TransformEdge.Bottom}
          />
          <EdgeVertical
            x={minX}
            y={minY + p}
            width={p}
            height={Math.max(0, height - p * 2)}
            edge={TransformEdge.Left}
          />
          <Corner
            x={minX}
            y={minY}
            width={cp}
            height={cp}
            corner={TransformCorner.TopLeft}
          />
          <Corner
            x={maxX}
            y={minY}
            width={cp}
            height={cp}
            corner={TransformCorner.TopRight}
          />
          <Corner
            x={maxX}
            y={maxY}
            width={cp}
            height={cp}
            corner={TransformCorner.BottomRight}
          />
          <Corner
            x={minX}
            y={maxY}
            width={cp}
            height={cp}
            corner={TransformCorner.BottomLeft}
          />
        </>
      )}
    </g>
  )
}

function Corner({
  x,
  y,
  width,
  height,
  corner,
}: {
  x: number
  y: number
  width: number
  height: number
  corner: TransformCorner
}) {
  const rRotateCorner = useRef<SVGRectElement>(null)
  const rCorner = useRef<SVGRectElement>(null)

  const isTop = corner.includes("top")
  const isLeft = corner.includes("bottom")

  return (
    <g>
      <StyledRotateCorner
        ref={rRotateCorner}
        x={x + width * (isLeft ? -1.25 : -0.5)}
        y={y + width * (isTop ? -1.25 : -0.5)}
        width={width * 1.75}
        height={height * 1.75}
        onPointerDown={(e) => {
          e.stopPropagation()
          rRotateCorner.current.setPointerCapture(e.pointerId)
          state.send("POINTED_ROTATE_CORNER", inputs.pointerDown(e, corner))
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          rRotateCorner.current.releasePointerCapture(e.pointerId)
          rRotateCorner.current.replaceWith(rRotateCorner.current)
          state.send("STOPPED_POINTING", inputs.pointerDown(e, corner))
        }}
      />
      <StyledCorner
        ref={rCorner}
        x={x + width * -0.5}
        y={y + height * -0.5}
        width={width}
        height={height}
        corner={corner}
        onPointerDown={(e) => {
          e.stopPropagation()
          rCorner.current.setPointerCapture(e.pointerId)
          state.send("POINTED_BOUNDS_CORNER", inputs.pointerDown(e, corner))
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          rCorner.current.releasePointerCapture(e.pointerId)
          rCorner.current.replaceWith(rCorner.current)
          state.send("STOPPED_POINTING", inputs.pointerDown(e, corner))
        }}
      />
    </g>
  )
}

function EdgeHorizontal({
  x,
  y,
  width,
  height,
  edge,
}: {
  x: number
  y: number
  width: number
  height: number
  edge: TransformEdge.Top | TransformEdge.Bottom
}) {
  const rEdge = useRef<SVGRectElement>(null)

  return (
    <StyledEdge
      ref={rEdge}
      x={x}
      y={y - height / 2}
      width={width}
      height={height}
      onPointerDown={(e) => {
        e.stopPropagation()
        rEdge.current.setPointerCapture(e.pointerId)
        state.send("POINTED_BOUNDS_EDGE", inputs.pointerDown(e, edge))
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        e.preventDefault()
        state.send("STOPPED_POINTING", inputs.pointerUp(e))
        rEdge.current.releasePointerCapture(e.pointerId)
        rEdge.current.replaceWith(rEdge.current)
      }}
      edge={edge}
    />
  )
}

function EdgeVertical({
  x,
  y,
  width,
  height,
  edge,
}: {
  x: number
  y: number
  width: number
  height: number
  edge: TransformEdge.Right | TransformEdge.Left
}) {
  const rEdge = useRef<SVGRectElement>(null)

  return (
    <StyledEdge
      ref={rEdge}
      x={x - width / 2}
      y={y}
      width={width}
      height={height}
      onPointerDown={(e) => {
        e.stopPropagation()
        state.send("POINTED_BOUNDS_EDGE", inputs.pointerDown(e, edge))
        rEdge.current.setPointerCapture(e.pointerId)
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        state.send("STOPPED_POINTING", inputs.pointerUp(e))
        rEdge.current.releasePointerCapture(e.pointerId)
        rEdge.current.replaceWith(rEdge.current)
      }}
      edge={edge}
    />
  )
}

const StyledEdge = styled("rect", {
  stroke: "none",
  fill: "none",
  variants: {
    edge: {
      bottom_edge: { cursor: "ns-resize" },
      right_edge: { cursor: "ew-resize" },
      top_edge: { cursor: "ns-resize" },
      left_edge: { cursor: "ew-resize" },
    },
  },
})

const StyledCorner = styled("rect", {
  stroke: "$bounds",
  fill: "#fff",
  zStrokeWidth: 2,
  variants: {
    corner: {
      top_left_corner: { cursor: "nwse-resize" },
      top_right_corner: { cursor: "nesw-resize" },
      bottom_right_corner: { cursor: "nwse-resize" },
      bottom_left_corner: { cursor: "nesw-resize" },
    },
  },
})

const StyledBounds = styled("rect", {
  fill: "none",
  stroke: "$bounds",
  zStrokeWidth: 2,
})

const StyledRotateCorner = styled("rect", {
  cursor: "grab",
  fill: "transparent",
})

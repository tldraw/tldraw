import state, { useSelector } from "state"
import styled from "styles"
import inputs from "state/inputs"
import { useRef } from "react"
import { TransformCorner, TransformEdge } from "types"
import { lerp } from "utils/utils"

export default function Bounds() {
  const zoom = useSelector((state) => state.data.camera.zoom)
  const bounds = useSelector((state) => state.values.selectedBounds)
  const singleSelection = useSelector((s) => {
    if (s.data.selectedIds.size === 1) {
      const selected = Array.from(s.data.selectedIds.values())[0]
      return s.data.document.pages[s.data.currentPageId].shapes[selected]
    }
  })
  const isBrushing = useSelector((state) => state.isIn("brushSelecting"))

  if (!bounds) return null

  let { minX, minY, maxX, maxY, width, height } = bounds

  const p = 4 / zoom
  const cp = p * 2

  return (
    <g
      pointerEvents={isBrushing ? "none" : "all"}
      transform={
        singleSelection &&
        `rotate(${singleSelection.rotation * (180 / Math.PI)},${
          minX + width / 2
        }, ${minY + width / 2})`
      }
    >
      <StyledBounds
        x={minX}
        y={minY}
        width={width}
        height={height}
        pointerEvents="none"
      />
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
      <RotateHandle x={minX + width / 2} y={minY - cp * 2} r={cp / 2} />
    </g>
  )
}

function RotateHandle({ x, y, r }: { x: number; y: number; r: number }) {
  const rRotateHandle = useRef<SVGCircleElement>(null)

  return (
    <StyledRotateHandle
      ref={rRotateHandle}
      cx={x}
      cy={y}
      r={r}
      onPointerDown={(e) => {
        e.stopPropagation()
        rRotateHandle.current.setPointerCapture(e.pointerId)
        state.send("POINTED_ROTATE_HANDLE", inputs.pointerDown(e, "rotate"))
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        rRotateHandle.current.releasePointerCapture(e.pointerId)
        rRotateHandle.current.replaceWith(rRotateHandle.current)
        state.send("STOPPED_POINTING", inputs.pointerDown(e, "rotate"))
      }}
    />
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
  const rCorner = useRef<SVGRectElement>(null)

  return (
    <g>
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

const StyledRotateHandle = styled("circle", {
  stroke: "$bounds",
  fill: "#fff",
  zStrokeWidth: 2,
  cursor: "grab",
})

const StyledBounds = styled("rect", {
  fill: "none",
  stroke: "$bounds",
  zStrokeWidth: 2,
})

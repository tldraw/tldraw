import state, { useSelector } from "state"
import { motion } from "framer-motion"
import styled from "styles"
import inputs from "state/inputs"

export default function Bounds() {
  const bounds = useSelector((state) => state.values.selectedBounds)
  const isBrushing = useSelector((state) => state.isIn("brushSelecting"))
  const zoom = useSelector((state) => state.data.camera.zoom)

  if (!bounds) return null

  const { minX, minY, maxX, maxY, width, height } = bounds

  const p = 4 / zoom
  const cp = p * 2

  return (
    <g pointerEvents={isBrushing ? "none" : "all"}>
      <StyledBounds
        x={minX}
        y={minY}
        width={width}
        height={height}
        pointerEvents="none"
      />
      {width * zoom > 8 && (
        <>
          <Corner
            x={minX}
            y={minY}
            corner={0}
            width={cp}
            height={cp}
            cursor="nwse-resize"
          />
          <Corner
            x={maxX}
            y={minY}
            corner={1}
            width={cp}
            height={cp}
            cursor="nesw-resize"
          />
          <Corner
            x={maxX}
            y={maxY}
            corner={2}
            width={cp}
            height={cp}
            cursor="nwse-resize"
          />
          <Corner
            x={minX}
            y={maxY}
            corner={3}
            width={cp}
            height={cp}
            cursor="nesw-resize"
          />
        </>
      )}
      <EdgeHorizontal
        x={minX + p}
        y={minY}
        width={Math.max(0, width - p * 2)}
        height={p}
        onSelect={(e) => {
          e.stopPropagation()
          if (e.buttons !== 1) return
          state.send("POINTED_BOUNDS_EDGE", {
            edge: 0,
            ...inputs.pointerDown(e),
          })
          document.body.style.cursor = "ns-resize"
        }}
      />
      <EdgeVertical
        x={maxX}
        y={minY + p}
        width={p}
        height={Math.max(0, height - p * 2)}
        onSelect={(e) => {
          e.stopPropagation()
          if (e.buttons !== 1) return
          state.send("POINTED_BOUNDS_EDGE", {
            edge: 1,
            ...inputs.pointerDown(e),
          })
          document.body.style.cursor = "ew-resize"
        }}
      />
      <EdgeHorizontal
        x={minX + p}
        y={maxY}
        width={Math.max(0, width - p * 2)}
        height={p}
        onSelect={(e) => {
          e.stopPropagation()
          if (e.buttons !== 1) return
          state.send("POINTED_BOUNDS_EDGE", {
            edge: 2,
            ...inputs.pointerDown(e),
          })
          document.body.style.cursor = "ns-resize"
        }}
      />
      <EdgeVertical
        x={minX}
        y={minY + p}
        width={p}
        height={Math.max(0, height - p * 2)}
        onSelect={(e) => {
          e.stopPropagation()
          if (e.buttons !== 1) return
          state.send("POINTED_BOUNDS_EDGE", {
            edge: 3,
            ...inputs.pointerDown(e),
          })
          document.body.style.cursor = "ew-resize"
        }}
      />
    </g>
  )
}

function Corner({
  x,
  y,
  width,
  height,
  cursor,
  onHover,
  corner,
}: {
  x: number
  y: number
  width: number
  height: number
  cursor: string
  corner: number
  onHover?: () => void
}) {
  const isTop = corner === 0 || corner === 1
  const isLeft = corner === 0 || corner === 3
  return (
    <g>
      <motion.rect
        x={x + width * (isLeft ? -1.25 : -0.5)} // + width * 2 * transformOffset[0]}
        y={y + width * (isTop ? -1.25 : -0.5)} // + height * 2 * transformOffset[1]}
        width={width * 1.75}
        height={height * 1.75}
        onPanEnd={restoreCursor}
        onTap={restoreCursor}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (e.buttons !== 1) return
          state.send("POINTED_ROTATE_CORNER", {
            corner,
            ...inputs.pointerDown(e),
          })
          document.body.style.cursor = "grabbing"
        }}
        style={{ cursor: "grab" }}
        fill="transparent"
      />
      <StyledCorner
        x={x + width * -0.5}
        y={y + height * -0.5}
        width={width}
        height={height}
        onPointerEnter={onHover}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (e.buttons !== 1) return
          state.send("POINTED_BOUNDS_CORNER", {
            corner,
            ...inputs.pointerDown(e),
          })
          document.body.style.cursor = "nesw-resize"
        }}
        onPanEnd={restoreCursor}
        onTap={restoreCursor}
        style={{ cursor }}
      />
    </g>
  )
}

function EdgeHorizontal({
  x,
  y,
  width,
  height,
  onHover,
  onSelect,
}: {
  x: number
  y: number
  width: number
  height: number
  onHover?: () => void
  onSelect?: (e: React.PointerEvent) => void
}) {
  return (
    <StyledEdge
      x={x}
      y={y - height / 2}
      width={width}
      height={height}
      onPointerEnter={onHover}
      onPointerDown={onSelect}
      onPanEnd={restoreCursor}
      onTap={restoreCursor}
      style={{ cursor: "ns-resize" }}
      direction="horizontal"
    />
  )
}

function EdgeVertical({
  x,
  y,
  width,
  height,
  onHover,
  onSelect,
}: {
  x: number
  y: number
  width: number
  height: number
  onHover?: () => void
  onSelect?: (e: React.PointerEvent) => void
}) {
  return (
    <StyledEdge
      x={x - width / 2}
      y={y}
      width={width}
      height={height}
      onPointerEnter={onHover}
      onPointerDown={onSelect}
      onPanEnd={restoreCursor}
      onTap={restoreCursor}
      direction="vertical"
    />
  )
}

function restoreCursor(e: PointerEvent) {
  state.send("STOPPED_POINTING", { id: "bounds", ...inputs.pointerUp(e) })
  document.body.style.cursor = "default"
}

const StyledEdge = styled(motion.rect, {
  stroke: "none",
  fill: "none",
  variant: {
    direction: {
      horizontal: { cursor: "ns-resize" },
      vertical: { cursor: "ew-resize" },
    },
  },
})

const StyledCorner = styled(motion.rect, {
  stroke: "$bounds",
  fill: "#fff",
  zStrokeWidth: 2,
})

const StyledBounds = styled("rect", {
  fill: "none",
  stroke: "$bounds",
  zStrokeWidth: 2,
})

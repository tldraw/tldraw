import React from "react"
import state from "state"
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
  return (
    <g
      transform={`translate(${point})`}
      onPointerDown={(e) =>
        state.send("POINTED_SHAPE", { id, ...getPointerEventInfo(e) })
      }
      onPointerUp={(e) =>
        state.send("STOPPED_POINTING_SHAPE", {
          id,
          ...getPointerEventInfo(e),
        })
      }
      onPointerEnter={(e) =>
        state.send("HOVERED_SHAPE", { id, ...getPointerEventInfo(e) })
      }
      onPointerLeave={(e) =>
        state.send("UNHOVERED_SHAPE", {
          id,
          ...getPointerEventInfo(e),
        })
      }
    >
      {children}
    </g>
  )
}

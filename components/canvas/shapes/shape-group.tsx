import React from "react"
import state from "state"
import { Shape } from "types"
import { getPointerEventInfo } from "utils/utils"

export default function ShapeGroup({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <g
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

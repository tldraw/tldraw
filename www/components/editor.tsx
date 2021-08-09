import * as React from "react"
import {
  ColorStyle,
  DashStyle,
  SizeStyle,
  TLDrawShapeType,
  TLDrawState,
} from "@tldraw/tldraw"
import { TLDraw, TLDrawDocument } from "@tldraw/tldraw"
import { usePersistence } from "../hooks/usePersistence"

const initialDoc: TLDrawDocument = {
  id: "doc",
  pages: {
    page1: {
      id: "page1",
      shapes: {
        rect1: {
          id: "rect1",
          parentId: "page1",
          name: "Rectangle",
          childIndex: 1,
          type: TLDrawShapeType.Rectangle,
          point: [32, 32],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
        },
        ellipse1: {
          id: "ellipse1",
          parentId: "page1",
          name: "Ellipse",
          childIndex: 2,
          type: TLDrawShapeType.Ellipse,
          point: [132, 132],
          radius: [50, 50],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Cyan,
          },
        },
        draw1: {
          id: "draw1",
          parentId: "page1",
          name: "Draw",
          childIndex: 3,
          type: TLDrawShapeType.Draw,
          point: [232, 232],
          points: [
            [50, 0],
            [100, 100],
            [0, 100],
            [50, 0],
            [100, 100],
            [0, 100],
            [50, 0],
            [56, 5],
          ],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Green,
          },
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: "page1",
      selectedIds: [],
      currentParentId: "page1",
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
}

export default function Editor() {
  const { value, setValue, status } = usePersistence("doc", initialDoc)

  const handleChange = React.useCallback(
    (tlstate: TLDrawState, reason: string) => {
      if (reason.startsWith("session")) {
        return
      }

      setValue(tlstate.document)
    },
    [setValue]
  )

  if (status === "loading" || value === null) {
    return <div />
  }

  console.log(value)

  return <TLDraw document={value} onChange={handleChange} />
}

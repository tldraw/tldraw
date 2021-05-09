import { memo } from "react"
import { useSelector } from "state"
import { ShapeType } from "types"
import Circle from "./shapes/circle"
import Rectangle from "./shapes/rectangle"

/*
Gets the shape from the current page's shapes, using the
provided ID. Depending on the shape's type, return the
component for that type.
*/

function Shape({ id }: { id: string }) {
  const shape = useSelector((state) => {
    const { currentPageId, document } = state.data
    return document.pages[currentPageId].shapes[id]
  })

  switch (shape.type) {
    case ShapeType.Circle:
      return <Circle {...shape} />
    case ShapeType.Rectangle:
      return <Rectangle {...shape} />
    default:
      return null
  }
}

export default memo(Shape)

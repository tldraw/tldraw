import { useSelector } from "state"
import { deepCompareArrays, getPage } from "utils/utils"
import Shape from "./shape"

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

export default function Page() {
  const currentPageShapeIds = useSelector(({ data }) => {
    return Object.values(getPage(data).shapes)
      .sort((a, b) => a.childIndex - b.childIndex)
      .map((shape) => shape.id)
  }, deepCompareArrays)

  return (
    <>
      {currentPageShapeIds.map((shapeId) => (
        <Shape key={shapeId} id={shapeId} />
      ))}
    </>
  )
}

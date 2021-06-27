import { useSelector } from 'state'
import Shape from './shape'
import usePageShapes from 'hooks/usePageShapes'

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

const noOffset = [0, 0]

export default function Page(): JSX.Element {
  const currentPageShapeIds = usePageShapes()

  const isSelecting = useSelector((s) => s.isIn('selecting'))

  return (
    <g pointerEvents={isSelecting ? 'all' : 'none'}>
      {currentPageShapeIds.map((shapeId) => (
        <Shape
          key={shapeId}
          id={shapeId}
          isSelecting={isSelecting}
          parentPoint={noOffset}
        />
      ))}
    </g>
  )
}

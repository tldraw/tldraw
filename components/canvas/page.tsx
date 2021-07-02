import { useSelector } from 'state'
import Shape from './shape'
import HoveredShape from './hovered-shape'
import usePageShapes from 'hooks/usePageShapes'

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

export default function Page(): JSX.Element {
  const showHovers = useSelector((s) =>
    s.isInAny('selecting', 'text', 'editingShape')
  )

  const visiblePageShapeIds = usePageShapes()

  const hoveredShapeId = useSelector((s) => {
    return visiblePageShapeIds.find((id) => id === s.data.hoveredId)
  })

  return (
    <g pointerEvents={showHovers ? 'all' : 'none'}>
      {showHovers && hoveredShapeId && (
        <HoveredShape key={hoveredShapeId} id={hoveredShapeId} />
      )}
      {visiblePageShapeIds.map((id) => (
        <Shape key={id} id={id} />
      ))}
    </g>
  )
}

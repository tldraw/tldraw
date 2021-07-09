import { useSelector } from 'state'
import tld from 'utils/tld'
import useShapeEvents from 'hooks/useShapeEvents'
import { Data, Shape, ShapeType, TextShape } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import { boundsCollide, boundsContain, shallowEqual } from 'utils'
import { memo, useRef } from 'react'

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

export default function Page(): JSX.Element {
  // Get the shapes that fit into the current window
  const shapeTree = useSelector((s) => {
    const allowHovers = s.isInAny('selecting', 'text', 'editingShape')

    const viewport = tld.getViewport(s.data)

    const shapesToShow = s.values.currentShapes.filter((shape) => {
      if (shape.type === ShapeType.Ray || shape.type === ShapeType.Line) {
        return true
      }

      const shapeBounds = getShapeUtils(shape).getBounds(shape)

      return (
        boundsContain(viewport, shapeBounds) ||
        boundsCollide(viewport, shapeBounds)
      )
    })

    const tree: Node[] = []

    shapesToShow.forEach((shape) =>
      addToTree(s.data, s.values.selectedIds, allowHovers, tree, shape)
    )

    return tree
  })

  return (
    <>
      {shapeTree.map((node) => (
        <ShapeNode key={node.shape.id} node={node} />
      ))}
    </>
  )
}

type Node = {
  shape: Shape
  children: Node[]
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isCurrentParent: boolean
}

function addToTree(
  data: Data,
  selectedIds: string[],
  allowHovers: boolean,
  branch: Node[],
  shape: Shape
): void {
  const node = {
    shape,
    children: [],
    isHovered: data.hoveredId === shape.id,
    isCurrentParent: data.currentParentId === shape.id,
    isEditing: data.editingId === shape.id,
    isSelected: selectedIds.includes(shape.id),
  }

  branch.push(node)

  if (shape.children) {
    shape.children
      .map((id) => tld.getShape(data, id))
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((shape) => {
        addToTree(data, selectedIds, allowHovers, node.children, shape)
      })
  }
}

const ShapeNode = ({
  node: { shape, children, isEditing, isHovered, isSelected, isCurrentParent },
}: {
  node: Node
  parentPoint?: number[]
}) => {
  return (
    <>
      <TranslatedShape
        shape={shape}
        isEditing={isEditing}
        isHovered={isHovered}
        isSelected={isSelected}
        isCurrentParent={isCurrentParent}
      />
      {children.map((childNode) => (
        <ShapeNode key={childNode.shape.id} node={childNode} />
      ))}
    </>
  )
}

interface TranslatedShapeProps {
  shape: Shape
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isCurrentParent: boolean
}

const TranslatedShape = memo(
  ({
    shape,
    isEditing,
    isHovered,
    isSelected,
    isCurrentParent,
  }: TranslatedShapeProps) => {
    const rGroup = useRef<SVGGElement>(null)
    const events = useShapeEvents(shape.id, isCurrentParent, rGroup)

    const center = getShapeUtils(shape).getCenter(shape)
    const rotation = shape.rotation * (180 / Math.PI)

    const transform = `
    rotate(${rotation}, ${center})
    translate(${shape.point})
    `

    return (
      <g ref={rGroup} transform={transform} pointerEvents="all" {...events}>
        {isEditing && shape.type === ShapeType.Text ? (
          <EditingTextShape shape={shape} />
        ) : (
          <RenderedShape
            shape={shape}
            isEditing={isEditing}
            isHovered={isHovered}
            isSelected={isSelected}
            isCurrentParent={isCurrentParent}
          />
        )}
      </g>
    )
  },
  shallowEqual
)

interface RenderedShapeProps {
  shape: Shape
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isCurrentParent: boolean
}

const RenderedShape = memo(
  function RenderedShape({
    shape,
    isEditing,
    isHovered,
    isSelected,
    isCurrentParent,
  }: RenderedShapeProps) {
    return getShapeUtils(shape).render(shape, {
      isEditing,
      isHovered,
      isSelected,
      isCurrentParent,
    })
  },
  (prev, next) => {
    if (
      prev.isEditing !== next.isEditing ||
      prev.isHovered !== next.isHovered ||
      prev.isSelected !== next.isSelected ||
      prev.isCurrentParent !== next.isCurrentParent
    ) {
      return false
    }

    if (next.shape !== prev.shape) {
      return !getShapeUtils(next.shape).shouldRender(next.shape, prev.shape)
    }

    return true
  }
)

function EditingTextShape({ shape }: { shape: TextShape }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  return getShapeUtils(shape).render(shape, {
    ref,
    isEditing: true,
    isHovered: false,
    isSelected: false,
    isCurrentParent: false,
  })
}

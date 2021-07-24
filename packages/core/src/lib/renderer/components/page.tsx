import * as React from 'react'
import { useShapeTree } from '../hooks/useShapeTree'
import { ShapeTreeNode, TLPage, TLPageState, TLShape } from '../../types'
import { Shape as ShapeComponent } from './shape'
import { useRenderOnResize, useTLContext } from '../hooks'

interface PageProps<T extends TLShape> {
  page: TLPage<T>
  pageState: TLPageState
}

export function Page<T extends TLShape>({
  page,
  pageState,
}: PageProps<T>): JSX.Element {
  const { callbacks, shapeUtils } = useTLContext()

  useRenderOnResize()

  const shapesToRender = useShapeTree(page, pageState, shapeUtils)

  React.useEffect(() => {
    callbacks.onChange?.(shapesToRender.map((node) => node.shape.id))
  }, [callbacks, shapesToRender])

  return (
    <>
      {shapesToRender.map((node) => (
        <ShapeNode key={node.shape.id} node={node} allowHovers={true} />
      ))}
    </>
  )
}

interface ShapeNodeProps {
  node: ShapeTreeNode
  allowHovers: boolean
}

const ShapeNode = ({
  node: {
    shape,
    children,
    isEditing,
    isHovered,
    isDarkMode,
    isSelected,
    isBinding,
    isCurrentParent,
  },
  allowHovers,
}: ShapeNodeProps) => {
  return (
    <>
      <ShapeComponent
        shape={shape}
        isEditing={isEditing}
        isHovered={allowHovers && isHovered}
        isSelected={isSelected}
        isDarkMode={isDarkMode}
        isBinding={isBinding}
        isCurrentParent={isCurrentParent}
      />
      {children.map((childNode) => (
        <ShapeNode
          key={childNode.shape.id}
          node={childNode}
          allowHovers={allowHovers}
        />
      ))}
    </>
  )
}

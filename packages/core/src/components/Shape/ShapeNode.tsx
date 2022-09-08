import * as React from 'react'
import type { TLShapeUtilsMap } from '~TLShapeUtil'
import type { IShapeTreeNode, TLShape } from '~types'
import { Shape } from './Shape'

export interface ShapeNodeProps<T extends TLShape> extends IShapeTreeNode<T> {
  utils: TLShapeUtilsMap<T>
}

function _ShapeNode<T extends TLShape>({
  shape,
  utils,
  meta,
  children,
  ...rest
}: ShapeNodeProps<T>) {
  return (
    <>
      <Shape shape={shape} utils={(utils as any)[shape.type]} meta={meta} {...rest} />
      {children &&
        children.map((childNode) => (
          <ShapeNode key={childNode.shape.id} utils={utils as any} {...childNode} />
        ))}
    </>
  )
}

export const ShapeNode = React.memo(_ShapeNode)

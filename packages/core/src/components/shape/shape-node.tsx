import { useObserver } from 'mobx-react-lite'
import * as React from 'react'
import type { IShapeTreeNode, TLShape } from '~types'
import { Shape } from './shape'
import type { TLShapeUtilsMap } from '~TLShapeUtil'

interface ShapeNodeProps<T extends TLShape> extends IShapeTreeNode<T> {
  utils: TLShapeUtilsMap<TLShape>
}

export const ShapeNode = function ShapeNode<T extends TLShape>({
  shape,
  utils,
  meta,
  children,
  ...rest
}: ShapeNodeProps<T>) {
  return useObserver(() => (
    <>
      <Shape shape={shape} utils={utils[shape.type as T['type']]} meta={meta} {...rest} />
      {children &&
        children.map((childNode) => (
          <ShapeNode key={childNode.shape.id} utils={utils} {...childNode} />
        ))}
    </>
  ))
}

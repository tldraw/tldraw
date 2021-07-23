import { Renderer, RendererProps, TLShape, TLState } from '@tldraw/core'
import { rectangle, RectangleShape, ellipse, EllipseShape } from './shapes'

export type BaseShapes = RectangleShape | EllipseShape

export const baseShapes: RendererProps<BaseShapes>['shapes'] = {
  rectangle,
  ellipse,
}

/* eslint-disable-next-line */
export interface TldrawProps
  extends Omit<RendererProps<BaseShapes>, 'shapes'> {}

export function Tldraw({ page, pageState, onMount }: TldrawProps) {
  return (
    <Renderer
      shapes={baseShapes}
      page={page}
      pageState={pageState}
      onMount={onMount}
    />
  )
}

export default Tldraw

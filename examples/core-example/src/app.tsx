import * as React from 'react'
import { Renderer, TLShapeUtilsMap } from '@tldraw/core'
import { BoxUtil, Shape } from './shapes'
import { useAppState } from 'hooks/useAppState'

export const shapeUtils: TLShapeUtilsMap<Shape> = {
  box: new BoxUtil(),
}

export default function App(): JSX.Element {
  const { page, pageState, meta, theme, events } = useAppState()

  return (
    <div className="tldraw">
      <Renderer
        shapeUtils={shapeUtils} // Required
        page={page} // Required
        pageState={pageState} // Required
        {...events}
        meta={meta}
        theme={theme}
        id={undefined}
        containerRef={undefined}
        hideBounds={false}
        hideIndicators={false}
        hideHandles={false}
        hideCloneHandles={false}
        hideBindingHandles={false}
        hideRotateHandles={false}
        userId={undefined}
        users={undefined}
        snapLines={undefined}
        onBoundsChange={undefined}
      />
    </div>
  )
}

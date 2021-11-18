import * as React from 'react'
import { mockDocument, renderWithContext } from '~test'
import { Canvas } from './canvas'

describe('page', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Canvas
        page={mockDocument.page}
        pageState={mockDocument.pageState}
        hideBounds={false}
        hideIndicators={false}
        hideHandles={false}
        hideBindingHandles={false}
        hideResizeHandles={false}
        hideCloneHandles={false}
        hideRotateHandle={false}
        onBoundsChange={() => {}}
      />
    )
  })
})

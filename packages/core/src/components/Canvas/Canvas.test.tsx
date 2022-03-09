import * as React from 'react'
import { mockDocument, renderWithContext } from '~test'
import { Canvas } from './Canvas'

describe('page', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Canvas
        page={mockDocument.page}
        pageState={mockDocument.pageState}
        hideBounds={false}
        hideGrid={false}
        hideIndicators={false}
        hideHandles={false}
        hideBindingHandles={false}
        hideResizeHandles={false}
        hideCloneHandles={false}
        hideRotateHandle={false}
        showDashedBrush={false}
        onBoundsChange={() => {
          // noop
        }}
        assets={{}}
      />
    )
  })
})

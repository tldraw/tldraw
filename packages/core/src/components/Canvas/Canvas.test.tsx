import * as React from 'react'
import { mockDocument, renderWithContext } from '~test'
import { Canvas } from './Canvas'

function TestCustomCursor() {
  return <div>Custom cursor</div>
}

describe('page', () => {
  test('mounts component without crashing', () => {
    expect(() =>
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
    ).not.toThrowError()
  })

  test('mounts component with custom cursors without crashing', () => {
    expect(() =>
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
          components={{ Cursor: TestCustomCursor }}
        />
      )
    ).not.toThrowError()
  })
})

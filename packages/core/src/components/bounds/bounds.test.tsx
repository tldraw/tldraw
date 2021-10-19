import { renderWithContext } from '+test'
import * as React from 'react'
import { Bounds } from './bounds'

describe('bounds', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Bounds
        zoom={1}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={0}
        viewportWidth={1000}
        isLocked={false}
        isHidden={false}
        hideBindingHandles={false}
        hideCloneHandles={false}
        hideRotateHandle={false}
      />
    )
  })
})

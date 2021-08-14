import * as React from 'react'
import { renderWithSvg } from '+test-utils'
import { Bounds } from './bounds'

describe('bounds', () => {
  test('mounts component', () => {
    renderWithSvg(
      <Bounds
        zoom={1}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={0}
        isLocked={false}
      />
    )
  })
})

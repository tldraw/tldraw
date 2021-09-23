import { render } from '@testing-library/react'
import * as React from 'react'
import { Bounds } from './bounds'

describe('bounds', () => {
  test('mounts component without crashing', () => {
    render(
      <Bounds
        zoom={1}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={0}
        viewportWidth={1000}
        isLocked={false}
        isHidden={false}
      />
    )
  })
})

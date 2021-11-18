import * as React from 'react'
import { renderWithSvg } from '~test'
import { Brush } from './brush'

describe('brush', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <Brush
        brush={{
          minX: 0,
          maxX: 100,
          minY: 0,
          maxY: 100,
          width: 100,
          height: 100,
        }}
      />
    )
  })
})

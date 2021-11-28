import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { BoundsBg } from '../BoundsBg'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('BoundsBg', () => {
  test('mounts component without crashing', () => {
    render(
      <BoundsBg
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={45}
        isHidden={false}
      />
    )
  })
  test('validate attributes for a bounds bg', () => {
    render(
      <BoundsBg
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={45}
        isHidden={false}
      />
    )
    const boundsBg = screen.getByLabelText('bounds bg')
    expect(boundsBg).toHaveAttribute('height', '100')
    expect(boundsBg).toHaveAttribute('width', '100')
    expect(boundsBg).toHaveAttribute('opacity', '1')
  })
})

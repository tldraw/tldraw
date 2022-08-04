import { screen } from '@testing-library/react'
import * as React from 'react'
import { renderWithSvg } from '~test'
import { Brush } from './Brush'

describe('brush', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <Brush
        zoom={1}
        dashed={false}
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

test('validate attributes for brush component', () => {
  renderWithSvg(
    <Brush
      zoom={1}
      dashed={false}
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

  const brush = screen.getByLabelText('brush')
  expect(brush).toHaveAttribute('width', '100')
  expect(brush).toHaveAttribute('height', '100')
  expect(brush).toHaveAttribute('opacity', '1')
  expect(brush).toHaveAttribute('x', '0')
  expect(brush).toHaveAttribute('y', '0')
})

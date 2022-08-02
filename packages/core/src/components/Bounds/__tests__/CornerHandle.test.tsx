import { screen } from '@testing-library/react'
import * as React from 'react'
import { renderWithContext } from '~test'
import { TLBoundsCorner } from '~types'
import { CornerHandle } from '../CornerHandle'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('CenterHandle', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <CornerHandle
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        corner={TLBoundsCorner.TopLeft}
      />
    )
  })
  test('top left corner > validate attributes', () => {
    renderWithContext(
      <CornerHandle
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        corner={TLBoundsCorner.TopLeft}
      />
    )
    const cornerTransparent = screen.getByLabelText('corner transparent')
    const cornerHandle = screen.getByLabelText('corner handle')

    expect(cornerTransparent).toHaveAttribute('height', '40')
    expect(cornerTransparent).toHaveAttribute('width', '40')
    expect(cornerTransparent).toHaveAttribute('x', '-21')
    expect(cornerTransparent).toHaveAttribute('y', '-21')

    expect(cornerHandle).toHaveAttribute('height', '10')
    expect(cornerHandle).toHaveAttribute('width', '10')
    expect(cornerHandle).toHaveAttribute('x', '-6')
    expect(cornerHandle).toHaveAttribute('y', '-6')
  })
  test('top right corner > validate attributes', () => {
    renderWithContext(
      <CornerHandle
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        corner={TLBoundsCorner.TopRight}
      />
    )
    const cornerTransparent = screen.getByLabelText('corner transparent')
    const cornerHandle = screen.getByLabelText('corner handle')

    expect(cornerTransparent).toHaveAttribute('height', '40')
    expect(cornerTransparent).toHaveAttribute('width', '40')
    expect(cornerTransparent).toHaveAttribute('x', '81')
    expect(cornerTransparent).toHaveAttribute('y', '-21')

    expect(cornerHandle).toHaveAttribute('height', '10')
    expect(cornerHandle).toHaveAttribute('width', '10')
    expect(cornerHandle).toHaveAttribute('x', '96')
    expect(cornerHandle).toHaveAttribute('y', '-6')
  })
  test('bottom left corner > validate attributes', () => {
    renderWithContext(
      <CornerHandle
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        corner={TLBoundsCorner.BottomLeft}
      />
    )
    const cornerTransparent = screen.getByLabelText('corner transparent')
    const cornerHandle = screen.getByLabelText('corner handle')

    expect(cornerTransparent).toHaveAttribute('height', '40')
    expect(cornerTransparent).toHaveAttribute('width', '40')
    expect(cornerTransparent).toHaveAttribute('x', '-21')
    expect(cornerTransparent).toHaveAttribute('y', '81')

    expect(cornerHandle).toHaveAttribute('height', '10')
    expect(cornerHandle).toHaveAttribute('width', '10')
    expect(cornerHandle).toHaveAttribute('x', '-6')
    expect(cornerHandle).toHaveAttribute('y', '96')
  })
  test('bottom right corner > validate attributes', () => {
    renderWithContext(
      <CornerHandle
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        corner={TLBoundsCorner.BottomRight}
      />
    )
    const cornerTransparent = screen.getByLabelText('corner transparent')
    const cornerHandle = screen.getByLabelText('corner handle')

    expect(cornerTransparent).toHaveAttribute('height', '40')
    expect(cornerTransparent).toHaveAttribute('width', '40')
    expect(cornerTransparent).toHaveAttribute('x', '81')
    expect(cornerTransparent).toHaveAttribute('y', '81')

    expect(cornerHandle).toHaveAttribute('height', '10')
    expect(cornerHandle).toHaveAttribute('width', '10')
    expect(cornerHandle).toHaveAttribute('x', '96')
    expect(cornerHandle).toHaveAttribute('y', '96')
  })
})

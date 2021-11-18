import * as React from 'react'
import { renderWithContext } from '~test'
import { screen } from '@testing-library/react'
import { EdgeHandle } from '../edge-handle'
import { TLBoundsEdge } from '~types'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('EdgeHandle', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <EdgeHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        edge={TLBoundsEdge.Top}
        isHidden={false}
      />
    )
  })
  test('top edge > validate attributes', () => {
    renderWithContext(
      <EdgeHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        edge={TLBoundsEdge.Top}
        isHidden={false}
      />
    )
    const edgeHandle = screen.getByLabelText('top_edge handle')

    expect(edgeHandle).toHaveAttribute('height', '10')
    expect(edgeHandle).toHaveAttribute('width', '91')
    expect(edgeHandle).toHaveAttribute('x', '5')
    expect(edgeHandle).toHaveAttribute('y', '-6')
  })
  test('bottom edge > validate attributes', () => {
    renderWithContext(
      <EdgeHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        edge={TLBoundsEdge.Bottom}
        isHidden={false}
      />
    )
    const edgeHandle = screen.getByLabelText('bottom_edge handle')

    expect(edgeHandle).toHaveAttribute('height', '10')
    expect(edgeHandle).toHaveAttribute('width', '91')
    expect(edgeHandle).toHaveAttribute('x', '5')
    expect(edgeHandle).toHaveAttribute('y', '96')
  })
  test('left edge > validate attributes', () => {
    renderWithContext(
      <EdgeHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        edge={TLBoundsEdge.Left}
        isHidden={false}
      />
    )
    const edgeHandle = screen.getByLabelText('left_edge handle')

    expect(edgeHandle).toHaveAttribute('height', '91')
    expect(edgeHandle).toHaveAttribute('width', '10')
    expect(edgeHandle).toHaveAttribute('x', '-6')
    expect(edgeHandle).toHaveAttribute('y', '5')
  })
  test('right edge > validate attributes', () => {
    renderWithContext(
      <EdgeHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        edge={TLBoundsEdge.Right}
        isHidden={false}
      />
    )
    const edgeHandle = screen.getByLabelText('right_edge handle')

    expect(edgeHandle).toHaveAttribute('height', '91')
    expect(edgeHandle).toHaveAttribute('width', '10')
    expect(edgeHandle).toHaveAttribute('x', '96')
    expect(edgeHandle).toHaveAttribute('y', '5')
  })
})

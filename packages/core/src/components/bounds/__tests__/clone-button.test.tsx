import { renderWithContext } from '~test'
import { screen } from '@testing-library/react'
import * as React from 'react'
import { CloneButton } from '../clone-button'
import { TLBoundsCorner } from '~types'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('CloneButton', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <CloneButton
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        side="top"
      />
    )
  })
  test('validate attributes for clone button', () => {
    renderWithContext(
      <CloneButton
        size={10}
        targetSize={20}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        side="top"
      />
    )

    const cloneBtn = screen.getByLabelText('clone button')

    expect(cloneBtn).toHaveAttribute('transform', 'translate(50, -44)')

    // transparent rect
    const rect = cloneBtn.querySelector('rect')

    expect(rect).toHaveAttribute('height', '80')
    expect(rect).toHaveAttribute('width', '80')
    expect(rect).toHaveAttribute('x', '-40')
    expect(rect).toHaveAttribute('y', '-40')

    expect(cloneBtn.querySelector('g')).toHaveAttribute('transform', 'rotate(270)')
    expect(cloneBtn.querySelector('circle')).toHaveAttribute('r', '20')
    expect(cloneBtn.querySelector('path')).toHaveAttribute('d', 'M -5,-5 L 5,0 -5,5 Z')
  })
})

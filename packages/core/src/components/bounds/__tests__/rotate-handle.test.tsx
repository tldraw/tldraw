import { renderWithContext } from '~test'
import { screen } from '@testing-library/react'
import * as React from 'react'
import { RotateHandle } from '../rotate-handle'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('RotateHandle', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <RotateHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        isHidden={false}
      />
    )
  })
  test('validates all attributes of rotate handle', () => {
    renderWithContext(
      <RotateHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        isHidden={false}
      />
    )

    const rht = screen.getByLabelText('rotate handle transparent')
    expect(rht).toHaveAttribute('cx', '50')
    expect(rht).toHaveAttribute('cy', '-20')
    expect(rht).toHaveAttribute('r', '20')

    const rh = screen.getByLabelText('rotate handle')
    expect(rh).toHaveAttribute('cx', '50')
    expect(rh).toHaveAttribute('cy', '-20')
    expect(rh).toHaveAttribute('r', '5')
  })
})

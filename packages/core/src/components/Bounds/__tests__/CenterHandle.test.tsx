import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { CenterHandle } from '../CenterHandle'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('CenterHandle', () => {
  test('mounts component without crashing', () => {
    expect(() =>
      render(
        <div>
          <CenterHandle
            bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
            isLocked={false}
            isHidden={false}
          />
        </div>
      )
    ).not.toThrowError()
  })
  test('validate attributes for a center handle', () => {
    render(
      <div>
        <CenterHandle
          bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
          isLocked={false}
          isHidden={false}
        />
      </div>
    )
    const centerHandle = screen.getByLabelText('center handle')
    expect(centerHandle).toHaveAttribute('height', '102')
    expect(centerHandle).toHaveAttribute('width', '102')
    expect(centerHandle).toHaveAttribute('x', '-1')
    expect(centerHandle).toHaveAttribute('y', '-1')
    expect(centerHandle).toHaveAttribute('opacity', '1')
  })
  test('validate attributes for a hidden center handle', () => {
    render(
      <div>
        <CenterHandle
          bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
          isLocked={false}
          isHidden={true}
        />
      </div>
    )
    const centerHandle = screen.getByLabelText('center handle')
    expect(centerHandle).toHaveAttribute('height', '102')
    expect(centerHandle).toHaveAttribute('width', '102')
    expect(centerHandle).toHaveAttribute('x', '-1')
    expect(centerHandle).toHaveAttribute('y', '-1')
    expect(centerHandle).toHaveAttribute('opacity', '0')
  })
})

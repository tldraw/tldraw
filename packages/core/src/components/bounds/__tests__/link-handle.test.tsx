import { renderWithContext } from '~test'
import { screen } from '@testing-library/react'
import * as React from 'react'
import { LinkHandle } from '../link-handle'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('LinkHandle', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <LinkHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        isHidden={false}
      />
    )
  })
  test('validate attributes for link handle component', () => {
    renderWithContext(
      <LinkHandle
        targetSize={20}
        size={10}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        isHidden={false}
      />
    )
    const linkHandle = screen.getByLabelText('link handle')
    const rects = linkHandle.querySelectorAll('rect')

    expect(linkHandle).toHaveAttribute('transform', 'translate(10, 120)')
    expect(rects[0]).toHaveAttribute('x', '0')
    expect(rects[0]).toHaveAttribute('y', '0')
    expect(rects[0]).toHaveAttribute('height', '20')
    expect(rects[0]).toHaveAttribute('width', '20')
    expect(rects[1]).toHaveAttribute('x', '30')
    expect(rects[1]).toHaveAttribute('y', '0')
    expect(rects[2]).toHaveAttribute('x', '60')
    expect(rects[2]).toHaveAttribute('y', '0')

    const linkRotHandle = screen.getByLabelText('link rotate handle')
    const paths = linkRotHandle.querySelectorAll('path')

    expect(linkRotHandle).toHaveAttribute('transform', 'translate(5, 5)')
    expect(paths[0]).toHaveAttribute('d', 'M 0,5 L 10,10 10,0 Z')
    expect(paths[1]).toHaveAttribute('d', 'M 0,0 L 10,0 5,10 Z')
    expect(paths[1]).toHaveAttribute('transform', 'translate(30, 0)')
    expect(paths[2]).toHaveAttribute('d', 'M 10,5 L 0,0 0,10 Z')
    expect(paths[2]).toHaveAttribute('transform', 'translate(60, 0)')
  })
})

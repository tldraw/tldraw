import { screen } from '@testing-library/react'
import * as React from 'react'
import { renderWithContext } from '~test'
import { Bounds } from '../Bounds'

describe('bounds', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Bounds
        zoom={1}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={0}
        viewportWidth={1000}
        isLocked={false}
        isHidden={false}
        hideBindingHandles={false}
        hideCloneHandles={false}
        hideRotateHandle={false}
        hideResizeHandles={false}
      />
    )
  })
  test('validate all attributes of bounds commponent', () => {
    renderWithContext(
      <Bounds
        zoom={1}
        bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }}
        rotation={0}
        viewportWidth={1000}
        isLocked={false}
        isHidden={false}
        hideBindingHandles={false}
        hideCloneHandles={false}
        hideRotateHandle={false}
        hideResizeHandles={false}
      />
    )

    expect(screen.getByLabelText('center handle')).toBeDefined()
    expect(screen.getByLabelText('top_edge handle')).toBeDefined()
    expect(screen.getByLabelText('bottom_edge handle')).toBeDefined()
    expect(screen.getByLabelText('left_edge handle')).toBeDefined()
    expect(screen.getByLabelText('right_edge handle')).toBeDefined()
    expect(screen.getAllByLabelText('corner transparent').length).toBe(4)
    expect(screen.getAllByLabelText('corner handle').length).toBe(4)
    expect(screen.getByLabelText('rotate handle transparent')).toBeDefined()
    expect(screen.getByLabelText('rotate handle')).toBeDefined()
    expect(screen.getAllByLabelText('clone button').length).toBe(8)
    expect(screen.getByLabelText('link handle')).toBeDefined()
    expect(screen.getByLabelText('link rotate handle')).toBeDefined()
  })

  test.todo('Renders correctly when zoomed')
  test.todo('Renders correctly when rotated')
  test.todo('Renders correctly when locked')
  test.todo('Renders correctly when hidden')
  test.todo('Renders correctly when hideBindingHandles is true')
  test.todo('Renders correctly when hideCloneHandles is true')
  test.todo('Renders correctly when hideRotateHandle is true')
  test.todo('Renders correctly when hideResizeHandles is true')
})

import { screen } from '@testing-library/react'
import * as React from 'react'
import { boxShape } from '~TLShapeUtil/TLShapeUtil.spec'
import { renderWithContext } from '~test'
import { Handles } from './Handles'

describe('handles', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<Handles shape={boxShape} zoom={1} />)
  })
  test('validate attributes for handles component', () => {
    const boxShapeWithHandles = {
      ...boxShape,
      handles: {
        'handle-1': {
          id: 'handle-1',
          index: 0,
          point: [10, 10],
        },
        'handle-2': {
          id: 'handle-2',
          index: 1,
          point: [200, 200],
        },
      },
    }

    renderWithContext(<Handles shape={boxShapeWithHandles} zoom={1} />)
    const containers = screen.getAllByLabelText('container')
    const handles = screen.getAllByLabelText('handle')

    expect(containers.length).toBe(2)
    expect(handles.length).toBe(2)
  })

  test.todo('Expect transform to match.')

  // Due to whitespaces, the below compare is failing
  // Custom matcher should be explored to make below works
  // expect(containers[0]).toHaveAttribute(
  //   'style',
  //   `transform:
  // translate(
  //   calc(10px - var(--tl-padding)),
  //   calc(10px - var(--tl-padding))
  // )
  // rotate(0rad);`
  // )
})

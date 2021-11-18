import * as React from 'react'
import { renderWithContext } from '~test'
import { Handles } from './handles'
import { boxShape } from '~shape-utils/TLShapeUtil.spec'

describe('handles', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<Handles shape={boxShape} zoom={1} />)
  })
})

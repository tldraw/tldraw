import * as React from 'react'
import { renderWithSvg } from '+test'
import { Defs } from './defs'

describe('defs', () => {
  test('mounts component', () => {
    renderWithSvg(<Defs zoom={1} />)
  })
})

import * as React from 'react'
import { renderWithSvg } from '+test-utils'
import { Brush } from './brush'

describe('brush', () => {
  test('mounts component', () => {
    renderWithSvg(<Brush />)
  })
})

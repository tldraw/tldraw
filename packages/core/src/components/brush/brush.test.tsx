import * as React from 'react'
import { renderWithSvg } from '+test'
import { Brush } from './brush'

describe('brush', () => {
  test('mounts component', () => {
    renderWithSvg(<Brush />)
  })
})

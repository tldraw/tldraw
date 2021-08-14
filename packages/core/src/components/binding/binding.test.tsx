import * as React from 'react'
import { renderWithSvg } from '+test'
import { Binding } from './binding'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('binding', () => {
  test('mounts component', () => {
    renderWithSvg(<Binding point={[0, 0]} type={'anchor'} />)
  })
})

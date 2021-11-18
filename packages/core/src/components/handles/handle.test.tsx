import * as React from 'react'
import { renderWithContext } from '~test'
import { screen } from '@testing-library/react'
import { Handle } from './handle'

describe('handle', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<Handle id="123" point={[100, 200]} />)
  })
  test('validate attributes for handle component', () => {
    renderWithContext(<Handle id="123" point={[100, 200]} />)
    const handle = screen.getByLabelText('handle')
    expect(handle.querySelectorAll('circle').length).toBe(2)
  })
})

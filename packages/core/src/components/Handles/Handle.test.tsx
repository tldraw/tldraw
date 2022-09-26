import { screen } from '@testing-library/react'
import * as React from 'react'
import { renderWithContext } from '~test'
import { Handle } from './Handle'

describe('handle', () => {
  test('mounts component without crashing', () => {
    expect(() => renderWithContext(<Handle id="123" point={[100, 200]} />)).not.toThrowError()
  })
  test('validate attributes for handle component', () => {
    renderWithContext(<Handle id="123" point={[100, 200]} />)
    const handle = screen.getByLabelText('handle')
    expect(handle.querySelectorAll('circle').length).toBe(2)
  })
})

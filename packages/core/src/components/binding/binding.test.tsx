import { render } from '@testing-library/react'
import * as React from 'react'
import { Binding } from './binding'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('binding', () => {
  test('mounts component without crashing', () => {
    render(<Binding point={[0, 0]} type={'anchor'} />)
  })
})

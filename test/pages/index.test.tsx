import React from 'react'
import { render } from '../testUtils'
import Home from '../../pages/index'

describe('Home page', () => {
  it('renders', () => {
    render(<Home />, {})
  })
})

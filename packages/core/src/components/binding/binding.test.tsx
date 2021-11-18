import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { Binding } from './binding'

jest.spyOn(console, 'error').mockImplementation(() => void null)

describe('binding', () => {
  test('mounts component without crashing', () => {
    render(<Binding point={[0, 0]} type={'anchor'} />)
  })
  test('validate attributes rendered properly for anchor binding type', () => {
    render(<Binding point={[10, 20]} type={'anchor'} />)

    const use = screen.getByLabelText('binding cross')
    expect(use).toHaveAttribute('href', '#cross')
    expect(use).toHaveAttribute('x', '10')
    expect(use).toHaveAttribute('y', '20')
  })
  test('validate attributes rendered properly for center binding type', () => {
    render(<Binding point={[10, 20]} type={'center'} />)

    const circle = screen.getByLabelText('binding circle')
    expect(circle).toHaveAttribute('cx', '10')
    expect(circle).toHaveAttribute('cy', '20')
    expect(circle).toHaveAttribute('r', '8')
  })
  test('validate no children should be rendered for pin binding type', () => {
    const { container } = render(<Binding point={[10, 20]} type={'pin'} />)
    const group = container.querySelector('g')
    expect(group?.hasChildNodes()).toBe(false)
  })
})

import { Triangle } from '..'

describe('Triangle shape', () => {
  it('Creates a shape', () => {
    expect(Triangle.create({ id: 'triangle' })).toMatchSnapshot('triangle')
  })
})

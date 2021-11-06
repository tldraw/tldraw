import { Rectangle } from '..'

describe('Rectangle shape', () => {
  it('Creates a shape', () => {
    expect(Rectangle.create({ id: 'rectangle' })).toMatchSnapshot('rectangle')
  })
})

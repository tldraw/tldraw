import { Rectangle } from './rectangle'

describe('Rectangle shape', () => {
  it('Creates a shape', () => {
    expect(Rectangle.create({ id: 'rectangle' })).toMatchSnapshot('rectangle')
  })
})

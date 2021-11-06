import { Ellipse } from '..'

describe('Ellipse shape', () => {
  it('Creates a shape', () => {
    expect(Ellipse.create({ id: 'ellipse' })).toMatchSnapshot('ellipse')
  })
})

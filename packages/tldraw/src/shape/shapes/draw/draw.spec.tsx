import { Draw } from './draw'

describe('Draw shape', () => {
  it('Creates a shape', () => {
    expect(Draw.create({ id: 'draw' })).toMatchSnapshot('draw')
  })
})

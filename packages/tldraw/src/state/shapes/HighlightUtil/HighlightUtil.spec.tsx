import { Highlight } from '..'

describe('Draw shape', () => {
  it('Creates a shape', () => {
    expect(Highlight.create({ id: 'draw' })).toMatchSnapshot('draw')
  })
})

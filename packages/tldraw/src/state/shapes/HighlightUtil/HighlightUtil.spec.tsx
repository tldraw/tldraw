import { Highlight } from '..'

describe('Highlight shape', () => {
  it('Creates a shape', () => {
    expect(Highlight.create({ id: 'highlight' })).toMatchSnapshot('highlight')
  })
})

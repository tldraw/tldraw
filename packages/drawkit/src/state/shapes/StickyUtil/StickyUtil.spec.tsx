import { Sticky } from '..'

describe('Post-It shape', () => {
  it('Creates a shape', () => {
    expect(Sticky.create).toBeDefined()
    // expect(Sticky.create({ id: 'sticky' })).toMatchSnapshot('sticky')
  })
})

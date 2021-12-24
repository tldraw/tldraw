import { Embed } from '..'

describe('Embed shape', () => {
  it('Creates a shape', () => {
    expect(Embed.create({ id: 'embed' })).toMatchSnapshot('embed')
  })
})

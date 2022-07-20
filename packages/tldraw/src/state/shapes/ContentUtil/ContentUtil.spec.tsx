import { Content } from '..'

describe('Edubreak Content Shape', () => {
  it('Creates a shape', () => {
    expect(Content.create).toBeDefined()
    expect(Content.create({ id: 'content' })).toMatchSnapshot('content')
  })
})

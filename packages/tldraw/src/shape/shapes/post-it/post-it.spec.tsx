import { PostIt } from './post-it'

describe('Post-It shape', () => {
  it('Creates a shape', () => {
    expect(PostIt.create).toBeDefined()
    // expect(PostIt.create({ id: 'postit' })).toMatchSnapshot('postit')
  })
})

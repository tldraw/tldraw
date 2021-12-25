import { Video } from '..'

describe('Video shape', () => {
  it('Creates a shape', () => {
    expect(Video.create({ id: 'video' })).toMatchSnapshot('video')
  })
})

import { Image } from '..'

describe('Image shape', () => {
  it('Creates a shape', () => {
    expect(Image.create({ id: 'image' })).toMatchSnapshot('image')
  })
})

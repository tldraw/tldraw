import { Text } from '..'

describe('Text shape', () => {
  it('Creates a shape', () => {
    expect(Text.create({ id: 'text' })).toMatchSnapshot('text')
  })
})

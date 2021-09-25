import { Text } from './text'

describe('Text shape', () => {
  it('Creates a shape', () => {
    expect(Text.create({ id: 'text' })).toMatchSnapshot('text')
  })
})

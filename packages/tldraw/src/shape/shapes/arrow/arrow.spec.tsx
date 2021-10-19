import { Arrow } from './arrow'

describe('Arrow shape', () => {
  it('Creates a shape', () => {
    expect(Arrow.create({ id: 'arrow' })).toMatchSnapshot('arrow')
  })
})

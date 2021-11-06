import { Group } from '..'

describe('Group shape', () => {
  it('Creates a shape', () => {
    expect(Group.create({ id: 'group' })).toMatchSnapshot('group')
  })
})

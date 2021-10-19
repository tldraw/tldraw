import { Group } from './group'

describe('Group shape', () => {
  it('Creates a shape', () => {
    expect(Group.create({ id: 'group' })).toMatchSnapshot('group')
  })
})

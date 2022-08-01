import {ViewZone} from '..'

describe('Viewzone shape', () => {
  it('Creates a shape', () => {
    expect(ViewZone.create({ id: 'viewzone' })).toMatchSnapshot('viewzone')
  })
})

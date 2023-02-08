import { Table } from '..'

describe('Table shape', () => {
  it('Creates a shape', () => {
    expect(Table.create({ id: 'table' })).toMatchSnapshot('table')
  })
})

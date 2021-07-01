import { getPerfectDashProps } from 'utils'

describe('ellipse dash props', () => {
  it('renders dashed props on a circle correctly', () => {
    expect(getPerfectDashProps(100, 4, 'dashed')).toMatchSnapshot(
      'small dashed circle dash props'
    )
    expect(getPerfectDashProps(100, 4, 'dashed')).toMatchSnapshot(
      'small dashed ellipse dash props'
    )
    expect(getPerfectDashProps(200, 8, 'dashed')).toMatchSnapshot(
      'large dashed circle dash props'
    )
    expect(getPerfectDashProps(200, 8, 'dashed')).toMatchSnapshot(
      'large dashed ellipse dash props'
    )
  })

  it('renders dotted props on a circle correctly', () => {
    expect(getPerfectDashProps(100, 4, 'dotted')).toMatchSnapshot(
      'small dotted circle dash props'
    )
    expect(getPerfectDashProps(100, 4, 'dotted')).toMatchSnapshot(
      'small dotted ellipse dash props'
    )
    expect(getPerfectDashProps(200, 8, 'dotted')).toMatchSnapshot(
      'large dotted circle dash props'
    )
    expect(getPerfectDashProps(200, 8, 'dotted')).toMatchSnapshot(
      'large dotted ellipse dash props'
    )
  })
})

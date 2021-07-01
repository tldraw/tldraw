import { DashStyle } from 'types'
import { getPerfectDashProps } from 'utils'

describe('ellipse dash props', () => {
  it('renders dashed props on a circle correctly', () => {
    expect(getPerfectDashProps(100, 4, DashStyle.Dashed)).toMatchSnapshot(
      'small dashed circle dash props'
    )
    expect(getPerfectDashProps(100, 4, DashStyle.Dashed)).toMatchSnapshot(
      'small dashed ellipse dash props'
    )
    expect(getPerfectDashProps(200, 8, DashStyle.Dashed)).toMatchSnapshot(
      'large dashed circle dash props'
    )
    expect(getPerfectDashProps(200, 8, DashStyle.Dashed)).toMatchSnapshot(
      'large dashed ellipse dash props'
    )
  })

  it('renders dotted props on a circle correctly', () => {
    expect(getPerfectDashProps(100, 4, DashStyle.Dotted)).toMatchSnapshot(
      'small dotted circle dash props'
    )
    expect(getPerfectDashProps(100, 4, DashStyle.Dotted)).toMatchSnapshot(
      'small dotted ellipse dash props'
    )
    expect(getPerfectDashProps(200, 8, DashStyle.Dotted)).toMatchSnapshot(
      'large dotted circle dash props'
    )
    expect(getPerfectDashProps(200, 8, DashStyle.Dotted)).toMatchSnapshot(
      'large dotted ellipse dash props'
    )
  })
})

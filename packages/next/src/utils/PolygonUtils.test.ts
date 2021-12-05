import { PolygonUtils } from './PolygonUtils'

describe('When finding the offset polygon', () => {
  test('When there is one point', () => {
    expect(PolygonUtils.getOffsetPolygon([[0, 0]], 10)).toStrictEqual([
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
    ])
  })

  test('When there are two points', () => {
    expect(
      PolygonUtils.getOffsetPolygon(
        [
          [0, 0],
          [10, 10],
        ],
        10
      )
    ).toMatchSnapshot()
  })

  test('When there are three points', () => {
    expect(
      PolygonUtils.getOffsetPolygon(
        [
          [0, 0],
          [10, 10],
          [-10, 10],
        ],
        10
      )
    ).toMatchSnapshot()
  })
})

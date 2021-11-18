import { getStroke, getStrokePoints } from 'perfect-freehand'

export function getComponentSvgPath(points: number[][]) {
  const stroke = getStroke(points, {
    size: 8,
  })

  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

export function getIndicatorSvgPath(points: number[][]) {
  const strokePoints = getStrokePoints(points).map((strokePoint) => strokePoint.point)

  if (!strokePoints.length) return ''

  const d = strokePoints.reduce(
    (acc, [x0, y0], i, arr) => {
      if (!arr[i + 1]) return acc
      const [x1, y1] = arr[i + 1]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...strokePoints[0], 'Q']
  )

  return d.join(' ')
}

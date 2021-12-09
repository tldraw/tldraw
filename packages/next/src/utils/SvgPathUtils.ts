export class SvgPathUtils {
  static getCurvedPathForPolygon(points: number[][]) {
    if (points.length < 3) {
      return `M -4, 0
      a 4,4 0 1,0 8,0
      a 4,4 0 1,0 -8,0`
    }

    const d = ['M', ...points[0].slice(0, 2), 'Q']
    const len = points.length
    for (let i = 1; i < len; i++) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[(i + 1) % len]
      d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    }
    d.push('Z')
    return d.join(' ')
  }

  static getCurvedPathForPoints(points: number[][]) {
    if (points.length < 3) {
      return `M -4, 0
      a 4,4 0 1,0 8,0
      a 4,4 0 1,0 -8,0`
    }

    const d = ['M', ...points[0].slice(0, 2), 'Q']
    const len = points.length
    for (let i = 1; i < len - 1; i++) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[i + 1]
      d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    }
    return d.join(' ')
  }
}

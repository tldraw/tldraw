import { intersectLineLine } from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { PI2, TAU } from '~constants'

export class PolygonUtils {
  static getEdges = (points: number[][]) => {
    const len = points.length
    return points.map((point, i) => [point, points[(i + 1) % len]])
  }

  // A must be left of B
  static getEdgeOutwardNormal = (A: number[], B: number[]) => {
    return Vec.per(Vec.uni(Vec.sub(B, A)))
  }

  // A must be left of B
  static getEdgeInwardNormal = (A: number[], B: number[]) => {
    return Vec.neg(PolygonUtils.getEdgeOutwardNormal(A, B))
  }

  static getOffsetEdge = (A: number[], B: number[], offset: number) => {
    const offsetVector = Vec.mul(Vec.per(Vec.uni(Vec.sub(B, A))), offset)
    return [Vec.add(A, offsetVector), Vec.add(B, offsetVector)]
  }

  static getOffsetEdges = (edges: number[][][], offset: number) => {
    return edges.map(([A, B]) => PolygonUtils.getOffsetEdge(A, B, offset))
  }

  static getOffsetPolygon = (points: number[][], offset: number) => {
    if (points.length < 1) {
      throw Error('Expected at least one point.')
    } else if (points.length === 1) {
      const A = points[0]
      return [
        Vec.add(A, [-offset, -offset]),
        Vec.add(A, [offset, -offset]),
        Vec.add(A, [offset, offset]),
        Vec.add(A, [-offset, offset]),
      ]
    } else if (points.length === 2) {
      const [A, B] = points
      return [
        ...PolygonUtils.getOffsetEdge(A, B, offset),
        ...PolygonUtils.getOffsetEdge(B, A, offset),
      ]
    }

    return PolygonUtils.getOffsetEdges(PolygonUtils.getEdges(points), offset).flatMap(
      (edge, i, edges) => {
        const intersection = intersectLineLine(edge, edges[(i + 1) % edges.length])
        if (intersection === undefined) throw Error('Expected an intersection')
        return intersection.points
      }
    )
  }

  static getPolygonVertices = (center: number[], size: number[], sides: number, ratio = 1) => {
    const [rx, ry] = Vec.div(size, 2)
    const pointsOnPerimeter = []
    for (let i = 0, step = PI2 / sides; i < sides; i++) {
      const t1 = (-TAU + i * step) % PI2
      const t2 = (-TAU + (i + 1) * step) % PI2
      const p1 = Vec.add(center, [rx * Math.cos(t1), ry * Math.sin(t1)])
      const p3 = Vec.add(center, [rx * Math.cos(t2), ry * Math.sin(t2)])
      const mid = Vec.med(p1, p3)
      const p2 = Vec.nudge(mid, center, Vec.dist(center, mid) * (1 - ratio))
      pointsOnPerimeter.push(p1, p2, p3)
    }
    return pointsOnPerimeter
  }

  static getStarVertices = (center: number[], size: number[], sides: number, ratio = 1) => {
    const outer = Vec.div(size, 2)
    const inner = Vec.mul(outer, ratio)
    const step = PI2 / sides / 2
    return Array.from(Array(sides * 2)).map((_, i) => {
      const theta = -TAU + i * step
      const [rx, ry] = i % 2 ? inner : outer
      return Vec.add(center, [rx * Math.cos(theta), ry * Math.sin(theta)])
    })

    // const pointsOnPerimeter: number[][] = []
    // for (let i = 0, steps = sides * 2, step = PI2 / steps; i < steps; i += 2) {
    //   const t1 = -TAU + i * step
    //   const t2 = -TAU + (i + 1) * step
    //   pointsOnPerimeter.push(
    //     Vec.add(center, [rx1 * Math.cos(t1), ry1 * Math.sin(t1)]),
    //     Vec.add(center, [rx2 * Math.cos(t2), ry2 * Math.sin(t2)])
    //   )
    // }
    // return pointsOnPerimeter
  }

  static getPolygonCentroid(points: number[][]): number[] {
    const x = points.map((point) => point[0])
    const y = points.map((point) => point[1])
    const cx = (Math.min(...x) + Math.max(...x)) / 2
    const cy = (Math.min(...y) + Math.max(...y)) / 2
    return [cx, cy]
  }
}

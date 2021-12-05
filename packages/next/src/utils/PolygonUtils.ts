import { intersectLineLine } from '@tldraw/intersect'
import Vec from '@tldraw/vec'

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
}

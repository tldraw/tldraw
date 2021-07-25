import Utils from './index'

// General

export class Svg {
  static ellipse = (A: number[], r: number): string => {
    return `M ${A[0] - r},${A[1]}
      a ${r},${r} 0 1,0 ${r * 2},0
      a ${r},${r} 0 1,0 -${r * 2},0 `
  }

  static moveTo = (v: number[]): string => {
    return `M ${v[0]},${v[1]} `
  }

  static lineTo = (v: number[]): string => {
    return `L ${v[0]},${v[1]} `
  }

  static line = (a: number[], ...pts: number[][]): string => {
    return Svg.moveTo(a) + pts.map((p): string => Svg.lineTo(p)).join()
  }

  static hLineTo = (v: number[]): string => {
    return `H ${v[0]},${v[1]} `
  }

  static vLineTo = (v: number[]): string => {
    return `V ${v[0]},${v[1]} `
  }

  static bezierTo = (A: number[], B: number[], C: number[]): string => {
    return `C ${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} `
  }

  static arcTo = (C: number[], r: number, A: number[], B: number[]): string => {
    return [
      Svg.moveTo(A),
      'A',
      r,
      r,
      0,
      Utils.getSweep(C, A, B) > 0 ? '1' : '0',
      0,
      B[0],
      B[1],
    ].join(' ')
  }

  static closePath = (): string => {
    return 'Z'
  }

  static rectTo = (A: number[]): string => {
    return ['R', A[0], A[1]].join(' ')
  }

  static getPointAtLength = (
    path: SVGPathElement,
    length: number
  ): number[] => {
    const point = path.getPointAtLength(length)
    return [point.x, point.y]
  }
}

export default Svg

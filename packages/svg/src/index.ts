// General
function angle(A: number[], B: number[]): number {
  return Math.atan2(B[1] - A[1], B[0] - A[0])
}

function shortAngleDist(A: number, B: number) {
  const max = Math.PI * 2
  const da = (B - A) % max
  return ((2 * da) % max) - da
}

function getArcLength(C: number[], r: number, A: number[], B: number[]): number {
  return r * (2 * Math.PI) * (shortAngleDist(angle(C, A), angle(C, B)) / (2 * Math.PI))
}

export const moveTo = (v: number[]): string => {
  return `M ${v} `
}

export const lineTo = (...v: number[][]): string => {
  return `L ${v.join(' ')} `
}

export const hLineTo = (v: number[]): string => {
  return `H ${v} `
}

export const vLineTo = (v: number[]): string => {
  return `V ${v} `
}

export const bezierTo = (A: number[], B: number[], C: number[]): string => {
  return `C ${A} ${B} ${C} `
}

export const arcTo = (C: number[], r: number, A: number[], B: number[]): string => {
  return [moveTo(A), 'A', r, r, 0, 0, getArcLength(C, r, A, B) > 0 ? '1' : '0', B[0], B[1]].join(
    ' '
  )
}

export const rectTo = (A: number[]): string => {
  return `R ${A}`
}

export const ellipse = (A: number[], r: number): string => {
  return `M ${A[0] - r},${A[1]}
      a ${r},${r} 0 1,0 ${r * 2},0
      a ${r},${r} 0 1,0 -${r * 2},0 `
}

export const line = (a: number[], ...pts: number[][]): string => {
  return moveTo(a) + lineTo(...pts)
}

export const closePath = (): string => {
  return 'Z'
}

export const getPointAtLength = (path: SVGPathElement, length: number): number[] => {
  const point = path.getPointAtLength(length)
  return [point.x, point.y]
}

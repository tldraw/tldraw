/**
 * Get balanced dash-strokearray and dash-strokeoffset properties for a path of a given length.
 * @param length The length of the path.
 * @param strokeWidth The shape's stroke-width property.
 * @param style The stroke's style: "dashed" or "dotted" (default "dashed").
 * @param snap An interval for dashes (e.g. 4 will produce arrays with 4, 8, 16, etc dashes).
 */
export function getPerfectDashProps(
  length: number,
  strokeWidth: number,
  style: 'dashed' | 'dotted' = 'dashed',
  snap = 1
): {
  strokeDasharray: string
  strokeDashoffset: string
} {
  let dashLength: number
  let strokeDashoffset: string
  let ratio: number

  if (style === 'dashed') {
    dashLength = strokeWidth * 2
    ratio = 1
    strokeDashoffset = (dashLength / 2).toString()
  } else {
    dashLength = strokeWidth / 100
    ratio = 100
    strokeDashoffset = '0'
  }

  let dashes = Math.floor(length / dashLength / (2 * ratio))
  dashes -= dashes % snap
  if (dashes === 0) dashes = 1

  const gapLength = (length - dashes * dashLength) / dashes

  return {
    strokeDasharray: [dashLength, gapLength].join(' '),
    strokeDashoffset,
  }
}

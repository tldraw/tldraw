import { Utils } from '@tldraw/core'
import { Theme, ColorStyle, DashStyle, ShapeStyles, SizeStyle } from '~types'

const canvasLight = '#fafafa'

const canvasDark = '#343d45'

const colors = {
  [ColorStyle.Black]: '#212528',
  [ColorStyle.White]: '#f0f1f3',
  [ColorStyle.LightGray]: '#c6cbd1',
  [ColorStyle.Gray]: '#788492',
  [ColorStyle.Green]: '#36b24d',
  [ColorStyle.Cyan]: '#0e98ad',
  [ColorStyle.Blue]: '#1c7ed6',
  [ColorStyle.Indigo]: '#4263eb',
  [ColorStyle.Violet]: '#7746f1',
  [ColorStyle.Red]: '#ff2133',
  [ColorStyle.Orange]: '#ff9433',
  [ColorStyle.Yellow]: '#ffc936',
}

export const stickyFills: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasLight, 0.45)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#ffffff',
    [ColorStyle.Black]: '#3d3d3d',
  },
  dark: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [
        k,
        Utils.lerpColor(Utils.lerpColor(v, '#999999', 0.3), canvasDark, 0.4),
      ])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#bbbbbb',
    [ColorStyle.Black]: '#1d1d1d',
  },
}

export const strokes: Record<Theme, Record<ColorStyle, string>> = {
  light: colors,
  dark: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasDark, 0.1)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#ffffff',
    [ColorStyle.Black]: '#000',
  },
}

export const fills: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasLight, 0.82)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#ffffff',
    [ColorStyle.Black]: '#ffffff',
  },
  dark: Object.fromEntries(
    Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasDark, 0.618)])
  ) as Record<ColorStyle, string>,
}

const strokeWidths = {
  [SizeStyle.Small]: 2,
  [SizeStyle.Medium]: 3.5,
  [SizeStyle.Large]: 5,
}

const fontSizes = {
  [SizeStyle.Small]: 32,
  [SizeStyle.Medium]: 64,
  [SizeStyle.Large]: 128,
  auto: 'auto',
}

const stickyFontSizes = {
  [SizeStyle.Small]: 24,
  [SizeStyle.Medium]: 36,
  [SizeStyle.Large]: 48,
  auto: 'auto',
}

export function getStrokeWidth(size: SizeStyle): number {
  return strokeWidths[size]
}

export function getFontSize(size: SizeStyle): number {
  return fontSizes[size]
}

export function getStickyFontSize(size: SizeStyle): number {
  return stickyFontSizes[size]
}

export function getFontStyle(style: ShapeStyles): string {
  const fontSize = getFontSize(style.size)
  const { scale = 1 } = style

  return `${fontSize * scale}px/1.3 "Caveat Brush"`
}

export function getStickyFontStyle(style: ShapeStyles): string {
  const fontSize = getStickyFontSize(style.size)
  const { scale = 1 } = style

  return `${fontSize * scale}px/1.3 "Caveat Brush"`
}

export function getStickyShapeStyle(style: ShapeStyles, isDarkMode = false) {
  const { color } = style

  const theme: Theme = isDarkMode ? 'dark' : 'light'
  const adjustedColor = color === ColorStyle.Black ? ColorStyle.Yellow : color

  return {
    fill: stickyFills[theme][adjustedColor],
    stroke: strokes[theme][adjustedColor],
    color: isDarkMode ? '#1d1d1d' : '#0d0d0d',
  }
}

export function getShapeStyle(
  style: ShapeStyles,
  isDarkMode = false
): {
  stroke: string
  fill: string
  strokeWidth: number
} {
  const { color, size, isFilled } = style

  const strokeWidth = getStrokeWidth(size)

  const theme: Theme = isDarkMode ? 'dark' : 'light'

  return {
    stroke: strokes[theme][color],
    fill: isFilled ? fills[theme][color] : 'none',
    strokeWidth,
  }
}

export const defaultStyle: ShapeStyles = {
  color: ColorStyle.Black,
  size: SizeStyle.Small,
  isFilled: false,
  dash: DashStyle.Draw,
}

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
  style: DashStyle,
  snap = 1,
  outset = true
): {
  strokeDasharray: string
  strokeDashoffset: string
} {
  let dashLength: number
  let strokeDashoffset: string
  let ratio: number

  if (style === DashStyle.Solid || style === DashStyle.Draw) {
    return {
      strokeDasharray: 'none',
      strokeDashoffset: 'none',
    }
  } else if (style === DashStyle.Dashed) {
    dashLength = strokeWidth * 2
    ratio = 1
    strokeDashoffset = outset ? (dashLength / 2).toString() : '0'
  } else {
    dashLength = strokeWidth / 100
    ratio = 100
    strokeDashoffset = '0'
  }

  let dashes = Math.floor(length / dashLength / (2 * ratio))

  dashes -= dashes % snap

  dashes = Math.max(dashes, 4)

  const gapLength = Math.max(
    dashLength,
    (length - dashes * dashLength) / (outset ? dashes : dashes - 1)
  )

  return {
    strokeDasharray: [dashLength, gapLength].join(' '),
    strokeDashoffset,
  }
}

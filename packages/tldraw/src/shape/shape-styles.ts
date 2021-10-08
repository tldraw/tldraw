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

export const textColors: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    [ColorStyle.Black]: '#000000',
    [ColorStyle.White]: '#000000',
    [ColorStyle.LightGray]: '#000000',
    [ColorStyle.Gray]: '#000000',
    [ColorStyle.Green]: '#000000',
    [ColorStyle.Cyan]: '#000000',
    [ColorStyle.Blue]: '#000000',
    [ColorStyle.Indigo]: '#000000',
    [ColorStyle.Violet]: '#000000',
    [ColorStyle.Red]: '#000000',
    [ColorStyle.Orange]: '#000000',
    [ColorStyle.Yellow]: '#000000',
  },
  dark: {
    [ColorStyle.Black]: '#FFFFFF',
    [ColorStyle.White]: '#FFFFFF',
    [ColorStyle.LightGray]: '#FFFFFF',
    [ColorStyle.Gray]: '#FFFFFF',
    [ColorStyle.Green]: '#FFFFFF',
    [ColorStyle.Cyan]: '#FFFFFF',
    [ColorStyle.Blue]: '#FFFFFF',
    [ColorStyle.Indigo]: '#FFFFFF',
    [ColorStyle.Violet]: '#FFFFFF',
    [ColorStyle.Red]: '#FFFFFF',
    [ColorStyle.Orange]: '#FFFFFF',
    [ColorStyle.Yellow]: '#FFFFFF',
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
  [SizeStyle.Medium]: 4,
  [SizeStyle.Large]: 8,
}

const fontSizes = {
  [SizeStyle.Small]: 40,
  [SizeStyle.Medium]: 64,
  [SizeStyle.Large]: 140,
  auto: 'auto',
}

const stickyFontSizes = {
  [SizeStyle.Small]: 16,
  [SizeStyle.Medium]: 24,
  [SizeStyle.Large]: 40,
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

  return {
    fill: strokes[theme][color],
    color: textColors[theme][color],
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
  size: SizeStyle.Medium,
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
  snap = 1
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

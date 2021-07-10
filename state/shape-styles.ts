import { Theme, ColorStyle, DashStyle, ShapeStyles, SizeStyle } from 'types'
import { lerpColor } from 'utils'

const canvasLight = '#fafafa'

const canvasDark = '#343d45'

const colors = {
  [ColorStyle.White]: '#f0f1f3',
  [ColorStyle.LightGray]: '#c6cbd1',
  [ColorStyle.Gray]: '#788492',
  [ColorStyle.Black]: '#212528',
  [ColorStyle.Green]: '#36b24d',
  [ColorStyle.Cyan]: '#0e98ad',
  [ColorStyle.Blue]: '#1c7ed6',
  [ColorStyle.Indigo]: '#4263eb',
  [ColorStyle.Violet]: '#7746f1',
  [ColorStyle.Red]: '#ff2133',
  [ColorStyle.Orange]: '#ff9433',
  [ColorStyle.Yellow]: '#ffc936',
}

export const strokes: Record<Theme, Record<ColorStyle, string>> = {
  light: colors,
  dark: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, lerpColor(v, canvasDark, 0.1)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#ffffff',
    [ColorStyle.Black]: '#000',
  },
}

export const fills: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [
        k,
        lerpColor(v, canvasLight, 0.82),
      ])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#ffffff',
    [ColorStyle.Black]: '#ffffff',
  },
  dark: Object.fromEntries(
    Object.entries(colors).map(([k, v]) => [k, lerpColor(v, canvasDark, 0.618)])
  ) as Record<ColorStyle, string>,
}

const strokeWidths = {
  [SizeStyle.Small]: 2,
  [SizeStyle.Medium]: 4,
  [SizeStyle.Large]: 8,
}

const fontSizes = {
  [SizeStyle.Small]: 24,
  [SizeStyle.Medium]: 48,
  [SizeStyle.Large]: 72,
  auto: 'auto',
}

export function getStrokeWidth(size: SizeStyle): number {
  return strokeWidths[size]
}

export function getFontSize(size: SizeStyle): number {
  return fontSizes[size]
}

export function getFontStyle(scale: number, style: ShapeStyles): string {
  const fontSize = getFontSize(style.size)

  return `${fontSize * scale}px/1.4 Verveine Regular`
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

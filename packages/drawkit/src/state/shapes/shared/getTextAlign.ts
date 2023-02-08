import { AlignStyle } from '~types'

const ALIGN_VALUES = {
  [AlignStyle.Start]: 'left',
  [AlignStyle.Middle]: 'center',
  [AlignStyle.End]: 'right',
  [AlignStyle.Justify]: 'justify',
} as const

export function getTextAlign(alignStyle: AlignStyle = AlignStyle.Start) {
  return ALIGN_VALUES[alignStyle]
}

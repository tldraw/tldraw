import { useStyle, css } from '~hooks/useStyle'

const customFonts = css`
  @import url('https://fonts.googleapis.com/css2?family=Caveat+Brush&display=swap');
`

export function useCustomFonts() {
  useStyle('tldraw-fonts', customFonts)
}

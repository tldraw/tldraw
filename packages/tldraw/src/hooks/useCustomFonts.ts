import { useStyle, css } from '~hooks/useStyle'

// const customFonts = css`
//   @font-face {
//     font-family: 'Verveine Regular';
//     font-style: normal;
//     font-weight: normal;
//     src: local('Verveine Regular'), url('/VerveineRegular.woff') format('woff');
//   }
// `

const customFonts = css`
  @import url('https://fonts.googleapis.com/css2?family=Caveat+Brush&display=swap');
`

export function useCustomFonts() {
  useStyle('tldraw-fonts', customFonts)
}

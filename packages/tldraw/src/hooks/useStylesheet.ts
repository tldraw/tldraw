import * as React from 'react'

const styles = new Map<string, HTMLStyleElement>()

const UID = `tldraw-fonts`
const WEBFONT_URL =
  'https://fonts.googleapis.com/css2?family=Caveat+Brush&family=Source+Code+Pro&family=Source+Sans+Pro&family=Crimson+Pro&display=block'
const CSS = `
@import url('');

@font-face {
  font-family: 'Caveat Brush';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(https://fonts.gstatic.com/s/recursive/v23/8vI-7wMr0mhh-RQChyHEH06TlXhq_gukbYrFMk1QuAIcyEwG_X-dpEfaE5YaERmK-CImKsvxvU-MXGX2fSqasNfUlTGZnI14ZeY.woff2)
    format('woff2');
}
`

export function useStylesheet() {
  React.useLayoutEffect(() => {
    if (styles.get(UID)) return
    const style = document.createElement('style')
    style.innerHTML = `@import url('${WEBFONT_URL}');`
    style.setAttribute('id', UID)
    document.head.appendChild(style)
    styles.set(UID, style)

    return () => {
      if (style && document.head.contains(style)) {
        document.head.removeChild(style)
        styles.delete(UID)
      }
    }
  }, [UID, CSS])
}

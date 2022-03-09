import * as React from 'react'

const styles = new Map<string, HTMLStyleElement>()

const UID = `Tldraw-fonts`
const WEBFONT_URL =
  'https://fonts.googleapis.com/css2?family=Caveat+Brush&family=Source+Code+Pro&family=Source+Sans+Pro&family=Crimson+Pro&display=block'
const CSS = `
@import url('');
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

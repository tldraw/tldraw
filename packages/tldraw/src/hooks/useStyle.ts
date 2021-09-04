import * as React from 'react'

const styles = new Map<string, HTMLStyleElement>()

export const css = (strings: TemplateStringsArray, ...args: unknown[]) =>
  strings.reduce(
    (acc, string, index) => acc + string + (index < args.length ? args[index] : ''),
    ''
  )

export function useStyle(uid: string, rules: string) {
  React.useLayoutEffect(() => {
    if (styles.get(uid)) {
      return () => void null
    }

    const style = document.createElement('style')
    style.innerHTML = rules
    style.setAttribute('id', uid)
    document.head.appendChild(style)
    styles.set(uid, style)

    return () => {
      if (style && document.head.contains(style)) {
        document.head.removeChild(style)
        styles.delete(uid)
      }
    }
  }, [uid, rules])
}

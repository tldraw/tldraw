import * as React from 'react'
import type { TLTheme } from '+types'

const styles = new Map<string, HTMLStyleElement>()

type AnyTheme = Record<string, string>

function makeCssTheme<T = AnyTheme>(prefix: string, theme: T) {
  return Object.keys(theme).reduce((acc, key) => {
    const value = theme[key as keyof T]
    if (value) {
      return acc + `${`--${prefix}-${key}`}: ${value};\n`
    }
    return acc
  }, '')
}

function useTheme<T = AnyTheme>(prefix: string, theme: T, selector = ':root') {
  React.useLayoutEffect(() => {
    const style = document.createElement('style')
    const cssTheme = makeCssTheme(prefix, theme)

    style.setAttribute('id', `${prefix}-theme`)
    style.setAttribute('data-selector', selector)
    style.innerHTML = `
        ${selector} {
          ${cssTheme}
        }
      `

    document.head.appendChild(style)

    return () => {
      if (style && document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [prefix, theme, selector])
}

function useStyle(uid: string, rules: string) {
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

const css = (strings: TemplateStringsArray, ...args: unknown[]) =>
  strings.reduce(
    (acc, string, index) => acc + string + (index < args.length ? args[index] : ''),
    ''
  )

const defaultTheme: TLTheme = {
  brushFill: 'rgba(0,0,0,.05)',
  brushStroke: 'rgba(0,0,0,.25)',
  selectStroke: 'rgb(66, 133, 244)',
  selectFill: 'rgba(65, 132, 244, 0.05)',
  background: 'rgb(248, 249, 250)',
  foreground: 'rgb(51, 51, 51)',
}

const tlcss = css`
  @font-face {
    font-family: 'Recursive';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url(https://fonts.gstatic.com/s/recursive/v23/8vI-7wMr0mhh-RQChyHEH06TlXhq_gukbYrFMk1QuAIcyEwG_X-dpEfaE5YaERmK-CImKsvxvU-MXGX2fSqasNfUlTGZnI14ZeY.woff2)
      format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
      U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  }

  @font-face {
    font-family: 'Recursive';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url(https://fonts.gstatic.com/s/recursive/v23/8vI-7wMr0mhh-RQChyHEH06TlXhq_gukbYrFMk1QuAIcyEwG_X-dpEfaE5YaERmK-CImKsvxvU-MXGX2fSqasNfUlTGZnI14ZeY.woff2)
      format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
      U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  }

  @font-face {
    font-family: 'Recursive Mono';
    font-style: normal;
    font-weight: 420;
    font-display: swap;
    src: url(https://fonts.gstatic.com/s/recursive/v23/8vI-7wMr0mhh-RQChyHEH06TlXhq_gukbYrFMk1QuAIcyEwG_X-dpEfaE5YaERmK-CImqvTxvU-MXGX2fSqasNfUlTGZnI14ZeY.woff2)
      format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
      U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  }

  .tl-container {
    --tl-zoom: 1;
    --tl-scale: calc(1 / var(--tl-zoom));
    --tl-camera-x: 0px;
    --tl-camera-y: 0px;
    --tl-padding: calc(32px * var(--tl-scale));
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 0px;
    margin: 0px;
    touch-action: none;
    overscroll-behavior: none;
    background-color: var(--tl-background);
  }

  .tl-container * {
    user-select: none;
    box-sizing: border-box;
  }

  .tl-absolute {
    position: absolute;
    top: 0px;
    left: 0px;
    transform-origin: center center;
  }

  .tl-positioned {
    position: absolute;
    top: 0px;
    left: 0px;
    transform-origin: center center;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tl-positioned-svg {
    width: 100%;
    height: 100%;
  }

  .tl-layer {
    transform: scale(var(--tl-zoom), var(--tl-zoom))
      translate(var(--tl-camera-x), var(--tl-camera-y));
    height: 0;
    width: 0;
  }

  .tl-counter-scaled {
    transform: scale(var(--tl-scale));
  }

  .tl-dashed {
    stroke-dasharray: calc(2px * var(--tl-scale)), calc(2px * var(--tl-scale));
  }

  .tl-transparent {
    fill: transparent;
    stroke: transparent;
  }

  .tl-cursor-ns {
    cursor: ns-resize;
  }

  .tl-cursor-ew {
    cursor: ew-resize;
  }

  .tl-cursor-nesw {
    cursor: nesw-resize;
  }

  .tl-cursor-nwse {
    cursor: nwse-resize;
  }

  .tl-corner-handle {
    stroke: var(--tl-selectStroke);
    fill: var(--tl-background);
    stroke-width: calc(1.5px * var(--tl-scale));
  }

  .tl-rotate-handle {
    stroke: var(--tl-selectStroke);
    fill: var(--tl-background);
    stroke-width: calc(1.5px * var(--tl-scale));
    cursor: grab;
  }

  .tl-binding {
    fill: var(--tl-selectFill);
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1px * var(--tl-scale));
    pointer-events: none;
  }

  .tl-selected {
    fill: transparent;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1.5px * var(--tl-scale));
    pointer-events: none;
  }

  .tl-hovered {
    fill: transparent;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1.5px * var(--tl-scale));
    pointer-events: none;
  }

  .tl-bounds {
    pointer-events: none;
  }

  .tl-bounds-center {
    fill: transparent;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1.5px * var(--tl-scale));
  }

  .tl-bounds-bg {
    stroke: none;
    fill: var(--tl-selectFill);
    pointer-events: all;
  }

  .tl-brush {
    fill: var(--tl-brushFill);
    stroke: var(--tl-brushStroke);
    stroke-width: calc(1px * var(--tl-scale));
    pointer-events: none;
  }

  .tl-canvas {
    overflow: hidden;
    width: 100%;
    height: 100%;
    touch-action: none;
    pointer-events: all;
  }

  .tl-dot {
    fill: var(--tl-background);
    stroke: var(--tl-foreground);
    stroke-width: 2px;
  }

  .tl-handles {
    pointer-events: all;
  }

  .tl-handles:hover > .tl-handle-bg {
    fill: var(--tl-selectFill);
  }

  .tl-handles:hover > .tl-handle-bg > * {
    stroke: var(--tl-selectFill);
  }

  .tl-handles:active > .tl-handle-bg {
    fill: var(--tl-selectFill);
  }

  .tl-handles:active > .tl-handle-bg > * {
    stroke: var(--tl-selectFill);
  }

  .tl-handle {
    fill: var(--tl-background);
    stroke: var(--tl-selectStroke);
    stroke-width: 1.5px;
  }

  .tl-handle-bg {
    fill: transparent;
    stroke: none;
    pointer-events: all;
    r: calc(20 / max(1, var(--tl-zoom)));
  }

  .tl-binding-indicator {
    stroke-width: calc(3px * var(--tl-scale));
    fill: var(--tl-selectFill);
    stroke: var(--tl-selected);
  }

  .tl-shape {
    outline: none;
  }

  .tl-shape > *[data-shy='true'] {
    opacity: 0;
  }

  .tl-shape:hover > *[data-shy='true'] {
    opacity: 1;
  }

  .tl-centered-g {
    transform: translate(var(--tl-padding), var(--tl-padding));
  }

  .tl-current-parent > *[data-shy='true'] {
    opacity: 1;
  }

  .tl-binding {
    fill: none;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(2px * var(--tl-scale));
  }
`

export function useTLTheme(theme?: Partial<TLTheme>) {
  const tltheme = React.useMemo<TLTheme>(
    () => ({
      ...defaultTheme,
      ...theme,
    }),
    [theme]
  )

  useTheme('tl', tltheme)

  useStyle('tl-canvas', tlcss)
}

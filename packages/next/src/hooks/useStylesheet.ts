import * as React from 'react'
import type { TLNuTheme } from '~types'

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

const defaultTheme: TLNuTheme = {
  accent: 'rgb(255, 0, 0)',
  brushFill: 'rgba(0,0,0,.05)',
  brushStroke: 'rgba(0,0,0,.25)',
  selectStroke: 'rgb(66, 133, 244)',
  selectFill: 'rgba(65, 132, 244, 0.05)',
  background: 'rgb(248, 249, 250)',
  foreground: 'rgb(51, 51, 51)',
  grid: 'rgba(144, 144, 144, 1)',
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

  .nu-container {
    --nu-zoom: 1;
    --nu-scale: calc(1 / var(--nu-zoom));
    --nu-padding: calc(64px * max(1, var(--nu-scale)));
    position: relative;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    box-sizing: border-box;
    padding: 0px;
    margin: 0px;
    z-index: 100;
    overflow: hidden;
    touch-action: none;
    overscroll-behavior: none;
    background-color: var(--nu-background);
  }

  .nu-container * {
    box-sizing: border-box;
  }

  .nu-overlay {
    background: none;
    fill: transparent;
    position: absolute;
    width: 100%;
    height: 100%;
    touch-action: none;
    pointer-events: none;
  }

  .nu-grid {
    position: absolute;
    width: 100%;
    height: 100%;
    touch-action: none;
    pointer-events: none;
    user-select: none;
  }

  .nu-snap-line {
    stroke: var(--nu-accent);
    stroke-width: calc(1px * var(--nu-scale));
  }

  .nu-snap-point {
    stroke: var(--nu-accent);
    stroke-width: calc(1px * var(--nu-scale));
  }

  .nu-canvas {
    position: absolute;
    width: 100%;
    height: 100%;
    touch-action: none;
    pointer-events: all;
    overflow: clip;
  }

  .nu-layer {
    position: absolute;
    top: 0px;
    left: 0px;
    height: 0px;
    width: 0px;
    contain: layout style size;
  }

  .nu-absolute {
    position: absolute;
    top: 0px;
    left: 0px;
    transform-origin: center center;
    contain: layout style size;
  }

  .nu-positioned {
    position: absolute;
    top: 0px;
    left: 0px;
    transform-origin: center center;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    contain: layout style size;
  }

  .nu-positioned-svg {
    width: 100%;
    height: 100%;
    overflow: hidden;
    contain: layout style size;
  }

  .nu-positioned-div {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    padding: var(--nu-padding);
    overflow: hidden;
    contain: layout style size;
  }

  .nu-counter-scaled {
    transform: scale(var(--nu-scale));
  }

  .nu-dashed {
    stroke-dasharray: calc(2px * var(--nu-scale)), calc(2px * var(--nu-scale));
  }

  .nu-transparent {
    fill: transparent;
    stroke: transparent;
  }

  .nu-cursor-ns {
    cursor: ns-resize;
  }

  .nu-cursor-ew {
    cursor: ew-resize;
  }

  .nu-cursor-nesw {
    cursor: nesw-resize;
  }

  .nu-cursor-nwse {
    cursor: nwse-resize;
  }

  .nu-corner-handle {
    stroke: var(--nu-selectStroke);
    fill: var(--nu-background);
    stroke-width: calc(1.5px * var(--nu-scale));
  }

  .nu-rotate-handle {
    stroke: var(--nu-selectStroke);
    fill: var(--nu-background);
    stroke-width: calc(1.5px * var(--nu-scale));
    cursor: grab;
  }

  .nu-binding {
    fill: var(--nu-selectFill);
    stroke: var(--nu-selectStroke);
    stroke-width: calc(1px * var(--nu-scale));
    pointer-events: none;
  }

  .nu-user {
    left: -4px;
    top: -4px;
    height: 8px;
    width: 8px;
    border-radius: 100%;
    pointer-events: none;
  }

  .nu-indicator {
    fill: transparent;
    stroke-width: calc(1.5px * var(--nu-scale));
    pointer-events: none;
  }

  tl-indicator-container {
    transform-origin: 0 0;
  }

  .nu-user-indicator-bounds {
    border-style: solid;
    border-width: calc(1px * var(--nu-scale));
  }

  .nu-selected {
    stroke: var(--nu-selectStroke);
  }

  .nu-hovered {
    stroke: var(--nu-selectStroke);
  }

  .nu-clone-target {
    pointer-events: all;
  }

  .nu-clone-target:hover .nu-clone-button {
    opacity: 1;
  }

  .nu-clone-button-target {
    cursor: pointer;
    pointer-events: all;
  }

  .nu-clone-button-target:hover .nu-clone-button {
    fill: var(--nu-selectStroke);
  }

  .nu-clone-button {
    opacity: 0;
    r: calc(8px * var(--nu-scale));
    stroke-width: calc(1.5px * var(--nu-scale));
    stroke: var(--nu-selectStroke);
    fill: var(--nu-background);
  }

  .nu-bounds {
    pointer-events: none;
    contain: layout style size;
  }

  .nu-bounds-bg {
    stroke: none;
    fill: var(--nu-selectFill);
    pointer-events: all;
    contain: layout style size;
  }

  .nu-bounds-fg {
    fill: transparent;
    stroke: var(--nu-selectStroke);
    stroke-width: calc(1.5px * var(--nu-scale));
  }

  .nu-brush {
    fill: var(--nu-brushFill);
    stroke: var(--nu-brushStroke);
    stroke-width: calc(1px * var(--nu-scale));
    pointer-events: none;
  }

  .nu-dot {
    fill: var(--nu-background);
    stroke: var(--nu-foreground);
    stroke-width: 2px;
  }

  .nu-handle {
    pointer-events: all;
  }

  .nu-handle:hover .nu-handle-bg {
    fill: var(--nu-selectFill);
  }

  .nu-handle:hover .nu-handle-bg > * {
    stroke: var(--nu-selectFill);
  }

  .nu-handle:active .nu-handle-bg {
    fill: var(--nu-selectFill);
  }

  .nu-handle:active .nu-handle-bg > * {
    stroke: var(--nu-selectFill);
  }

  .nu-handle {
    fill: var(--nu-background);
    stroke: var(--nu-selectStroke);
    stroke-width: 1.5px;
  }

  .nu-handle-bg {
    fill: transparent;
    stroke: none;
    pointer-events: all;
    r: calc(16px / max(1, var(--nu-zoom)));
  }

  .nu-binding-indicator {
    stroke-width: calc(3px * var(--nu-scale));
    fill: var(--nu-selectFill);
    stroke: var(--nu-selected);
  }

  .nu-centered-g {
    transform: translate(var(--nu-padding), var(--nu-padding));
  }

  .nu-current-parent > *[data-shy='true'] {
    opacity: 1;
  }

  .nu-binding {
    fill: none;
    stroke: var(--nu-selectStroke);
    stroke-width: calc(2px * var(--nu-scale));
  }

  .nu-grid-dot {
    fill: var(--nu-grid);
  }
`

export function useStylesheet(theme?: Partial<TLNuTheme>, selector?: string) {
  const tltheme = React.useMemo<TLNuTheme>(
    () => ({
      ...defaultTheme,
      ...theme,
    }),
    [theme]
  )

  useTheme('nu', tltheme, selector)

  useStyle('nu-canvas', tlcss)
}

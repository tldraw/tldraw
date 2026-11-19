import { localStorageAtom } from 'tldraw'

/**
 * Whether this browser shows the v3 UI while signed out, when there is no account for `ui_v3` to
 * be evaluated for. A signed-in session overwrites it with its own flag.
 */
export const [uiV3Preview] = localStorageAtom('tla-ui-v3-preview', false)

const param = new URLSearchParams(window.location.search).get('ui_v3')
if (param === '1') uiV3Preview.set(true)
if (param === '0') uiV3Preview.set(false)

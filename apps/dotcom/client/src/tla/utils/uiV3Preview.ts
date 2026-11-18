import { localStorageAtom } from 'tldraw'

/**
 * Whether this browser shows the v3 UI while signed out. `ui_v3` is evaluated per account, so a
 * signed-out visitor has no flag: this remembers the last account's value instead, which lets
 * someone on the allowlist sign out and see the signed-out side of the redesign. `?ui_v3=1` and
 * `?ui_v3=0` set it by hand. A signed-in session ignores it and always overwrites it.
 */
export const [uiV3Preview] = localStorageAtom('tla-ui-v3-preview', false)

const param = new URLSearchParams(window.location.search).get('ui_v3')
if (param === '1') uiV3Preview.set(true)
if (param === '0') uiV3Preview.set(false)

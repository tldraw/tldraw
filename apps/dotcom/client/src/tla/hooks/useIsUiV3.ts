import { useValue } from 'tldraw'
import { uiV3Preview } from '../utils/uiV3Preview'
import { useMaybeApp } from './useAppState'

/** Whether to show the v3 UI: the account's `ui_v3` flag, or signed out, this browser's
 *  {@link uiV3Preview}. */
export function useIsUiV3() {
	const app = useMaybeApp()
	const isPreviewing = useValue(uiV3Preview)
	return app ? app.isUiV3Enabled : isPreviewing
}

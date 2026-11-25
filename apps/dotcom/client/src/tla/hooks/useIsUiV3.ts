import { useMaybeApp } from './useAppState'

/** Whether the signed-in user gets the v3 UI (the `ui_v3` flag). Signed-out users never do. */
export function useIsUiV3() {
	return useMaybeApp()?.isUiV3Enabled ?? false
}

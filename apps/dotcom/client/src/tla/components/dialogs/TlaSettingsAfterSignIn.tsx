import { useEffect } from 'react'
import { useDialogs } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { clearReopenSettingsAfterSignIn, getReopenSettingsAfterSignIn } from '../../utils/redirect'
import { TlaSettingsDialog } from './TlaSettingsDialog'

/**
 * Brings the settings dialog back after a sign-in that started from its Profile tab. Signing in
 * remounts everything under `SignedInProvider`, open dialogs included, so the dialog the button
 * was pressed in is gone by the time there is a profile to edit.
 */
export function TlaSettingsAfterSignIn() {
	const app = useMaybeApp()
	const { addDialog } = useDialogs()

	useEffect(() => {
		if (!app || !getReopenSettingsAfterSignIn()) return
		clearReopenSettingsAfterSignIn()
		// The dialog belongs to v3, which the account that signed in may not have.
		if (app.isUiV3Enabled) addDialog({ component: () => <TlaSettingsDialog /> })
	}, [app, addDialog])

	return null
}

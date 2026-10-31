import { useCallback } from 'react'
import { defineMessages, useTranslation } from 'tldraw'
import { UI_THEMES } from '../themes/ui-themes'
import { useTldrawAppUiEvents } from '../utils/app-ui-events'
import { setColorThemePreview, updateLocalSessionState } from '../utils/local-session-state'

const messages = defineMessages({
	colorThemeDefault: { defaultMessage: 'Default' },
})

export function useColorThemeOptions() {
	const msg = useTranslation()
	return [
		{ value: 'default', label: msg(messages.colorThemeDefault) },
		...UI_THEMES.map(({ id, name }) => ({ value: id, label: name })),
	]
}

export function useSelectColorTheme() {
	const trackEvent = useTldrawAppUiEvents()
	return useCallback(
		(id: string) => {
			updateLocalSessionState(() => ({ colorTheme: id }))
			setColorThemePreview(null)
			trackEvent('set-color-theme', { source: 'user-preferences', theme: id })
		},
		[trackEvent]
	)
}

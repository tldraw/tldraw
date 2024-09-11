import { DefaultColorThemePalette, exhaustiveSwitchError } from '@tldraw/editor'
import { TLTimerState } from './Timer'

export function formatTime(time: number) {
	return time.toString().padStart(2, '0')
}

export function getBackgroundColor(state: TLTimerState, darkMode: boolean) {
	const scheme = darkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode

	switch (state) {
		case 'running':
			return scheme.red.semi
		case 'paused':
			return scheme.orange.semi
		case 'stopped':
			return undefined
		case 'completed':
			return scheme.green.semi
		default:
			exhaustiveSwitchError(state)
	}
}

export function getBorderColor(state: TLTimerState, darkMode: boolean) {
	const scheme = darkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode

	switch (state) {
		case 'running':
			return scheme.red.solid
		case 'paused':
			return scheme.orange.solid
		case 'stopped':
		case 'completed':
			return undefined
		default:
			exhaustiveSwitchError(state)
	}
}

export function getMinutesAndSeconds(time: number) {
	const allSeconds = Math.floor(time / 1000)
	const minutes = Math.floor(allSeconds / 60)
	const seconds = allSeconds % 60
	return { allSeconds, seconds, minutes }
}

import { TlaFlags } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'

export function useHasFlag(...flags: TlaFlags[]) {
	const app = useApp()
	return useValue('hasFlag:' + flags.join(','), () => flags.every((flag) => app.hasFlag(flag)), [
		app,
		flags.join(','),
	])
}

import { TlaFlags } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'

export function useHasFlag(flag: TlaFlags) {
	const app = useApp()
	return useValue('hasFlag:' + flag, () => app.hasFlag(flag), [app])
}

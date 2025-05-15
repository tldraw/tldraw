import { useMemo } from 'react'
import { TldrawAiModule, TldrawAiModuleOptions } from './TldrawAiModule'

/** @public */
export function useTldrawAiModule(options: TldrawAiModuleOptions) {
	const ai = useMemo(() => new TldrawAiModule(options), [options])
	return ai
}

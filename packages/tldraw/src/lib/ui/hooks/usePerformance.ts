import { debugFlags, measureCbDuration, useValue } from '@tldraw/editor'
import { TLUiEventSource } from '../context/events'
import { TLUiOverrides } from '../overrides'

/** @internal */
export function usePerformance(): TLUiOverrides {
	const measurePerformance = useValue(
		'measurePerformance',
		() => debugFlags.measurePerformance.get(),
		[debugFlags]
	)
	if (!measurePerformance) return {}
	return {
		actions(_editor, actions) {
			Object.keys(actions).forEach((key) => {
				const action = actions[key]
				const cb = action.onSelect
				action.onSelect = (source: TLUiEventSource) => {
					return measureCbDuration(key, () => cb(source))
				}
			})

			return actions
		},
	}
}

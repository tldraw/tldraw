/* eslint-disable local/no-at-internal -- this is only used for our internal develop endpoint */
import { TLUiEventSource, TLUiOverrides, debugFlags, measureCbDuration, useValue } from 'tldraw'

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
					return measureCbDuration(`Action ${key}`, () => cb(source))
				}
			})

			return actions
		},
	}
}

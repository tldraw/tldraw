import { TLUiEventSource, TLUiOverrides, debugFlags, measureCbDuration, useValue } from 'tldraw'

export function usePerformance(): TLUiOverrides {
	const measureActionDurations = useValue(
		'measureActionDurations',
		() => debugFlags.measureActionDuration.get(),
		[debugFlags]
	)
	if (!measureActionDurations) return {}
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

import { trackAnalyticsEvent } from './trackAnalyticsEvent'

export type UI_OVERRIDE_TODO_EVENT = any

export function useHandleUiEvents() {
	return trackAnalyticsEvent
}

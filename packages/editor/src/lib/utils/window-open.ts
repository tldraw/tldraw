import { runtime } from './runtime'

/** @public */
export function openWindow(url: string, target = '_blank', allowReferrer = false) {
	runtime.openWindow(url, target, allowReferrer)
}

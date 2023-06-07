import { runtime } from './runtime'

/** @public */
export function openWindow(url: string, target = '_blank') {
	runtime.openWindow(url, target)
}

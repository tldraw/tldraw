import { To } from 'react-router-dom'

export function getRel(href: string | To, newTab: true): 'noopener noreferrer' | 'noopener'
export function getRel(href: string | To, newTab: false): ''
export function getRel(href: string | To, newTab?: boolean) {
	let rel = '' as 'noopener' | 'noopener noreferrer' | ''
	if (newTab) {
		rel = 'noopener'
		if (typeof href === 'string' && !href.includes('tldraw.com')) {
			return 'noopener noreferrer'
		}
	}
	return rel
}

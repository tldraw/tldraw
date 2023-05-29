import { TLStyle } from '../records/TLStyle'

/** @public */
export interface FontStyle extends TLStyle {
	type: 'font'
	id: 'draw' | 'sans' | 'serif' | 'mono'
	value: string
}

/** @public */
export const font: FontStyle[] = [
	{ id: 'draw', type: 'font', value: 'var(--tl-font-draw)' },
	{ id: 'sans', type: 'font', value: 'var(--tl-font-sans)' },
	{ id: 'serif', type: 'font', value: 'var(--tl-font-serif)' },
	{ id: 'mono', type: 'font', value: 'var(--tl-font-mono)' },
]

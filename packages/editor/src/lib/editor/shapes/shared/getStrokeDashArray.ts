import { TLDefaultDashStyle } from '@tldraw/tlschema'

export function getStrokeDashArray(dash: TLDefaultDashStyle, strokeWidth: number) {
	switch (dash) {
		case 'dashed':
			return `${strokeWidth * 2} ${strokeWidth * 2}`
		case 'dotted':
			return `0 ${strokeWidth * 2}`
		case 'solid':
			return ``
	}
}

import { TLColorType } from '@tldraw/tlschema'

export function getCssColor(id: TLColorType): string {
	return `var(--palette-${id})`
}

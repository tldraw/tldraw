import { TLColorType } from '@tldraw/tlschema'

export function getCssFillColor(id: TLColorType): string {
	return `var(--palette-${id})`
}

export function getCssSemiColor(id: TLColorType): string {
	return `var(--palette-${id}-semi)`
}

export function getCssPatternColor(id: TLColorType): string {
	return `var(--palette-${id}-pattern)`
}

export function getCssSolidColor(): string {
	return `var(--palette-solid)`
}

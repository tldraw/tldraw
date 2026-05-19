import { TLShape, TLShapePartial } from '@tldraw/tlschema'

/**
 * Merge a partial shape into an existing shape. Shallow-merges top-level
 * fields; deep-merges `props` and `meta` one level (Editor semantics).
 */
export function mergeShapePartial(existing: TLShape, partial: TLShapePartial): TLShape {
	const { props: partialProps, meta: partialMeta, ...rest } = partial as any
	const merged: any = { ...existing, ...rest }
	if (partialProps) {
		merged.props = { ...(existing as any).props, ...partialProps }
	}
	if (partialMeta) {
		merged.meta = { ...(existing as any).meta, ...partialMeta }
	}
	return merged as TLShape
}

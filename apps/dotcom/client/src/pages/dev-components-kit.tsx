/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'

/**
 * Shared specimen card for the /dev/components/* inventory pages, so every
 * family shows the same overview shape: a rendered instance, the literal props
 * that produced it, the divergence note, and where it lives.
 */
export const Specimen = ({
	label,
	code,
	meta,
	source,
	children,
}: {
	label: string
	/** The literal JSX / props used to render this specimen. */
	code?: string
	/** A short note — the divergent property, or what to look at. */
	meta?: string
	/** Where this instance is defined / which component renders it. */
	source?: string
	children: ReactNode
}): ReactNode => (
	<div className="specimen">
		<div className="specimen__stage">{children}</div>
		<div className="specimen__label">{label}</div>
		{code && <div className="specimen__code">{code}</div>}
		{meta && <div className="specimen__meta">{meta}</div>}
		{source && <div className="specimen__source">{source}</div>}
	</div>
)

/** The shared card + grid styling. Append to each page's <style>. */
export const SPECIMEN_CSS = `
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.specimen { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 20px 16px 14px; background: var(--tl-color-panel); display: flex; flex-direction: column; gap: 12px; }
.specimen__stage { min-height: 56px; display: flex; align-items: center; justify-content: center; background: var(--tl-color-low); border-radius: 6px; padding: 12px; overflow: hidden; }
.specimen__label { font-size: 12px; font-weight: 600; font-family: ui-monospace, monospace; }
.specimen__code { font-size: 11px; line-height: 1.4; color: var(--tl-color-text-1); font-family: ui-monospace, monospace; background: var(--tl-color-low); border-radius: 4px; padding: 5px 7px; white-space: pre-wrap; word-break: break-word; }
.specimen__meta { font-size: 11px; line-height: 1.5; color: var(--tl-color-text-3); font-family: ui-monospace, monospace; }
.specimen__source { font-size: 10px; line-height: 1.5; color: var(--tl-color-text-3); font-family: ui-monospace, monospace; border-top: 1px dashed var(--tl-color-divider); padding-top: 8px; }
`

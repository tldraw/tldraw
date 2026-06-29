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
	mock,
	children,
}: {
	label: string
	/** The literal JSX / props used to render this specimen. */
	code?: string
	/** A short note — the divergent property, or what to look at. */
	meta?: string
	/** Where this instance is defined / which component renders it. */
	source?: string
	/**
	 * True when the stage shows a hand-drawn representation rather than the real
	 * component (because the real one needs editor / dialog / asset context to
	 * mount). Defaults to false = a live render of the referenced code.
	 */
	mock?: boolean
	children: ReactNode
}): ReactNode => (
	<div className="specimen">
		<span className="specimen__badge" data-mock={mock || undefined}>
			{mock ? 'mock' : 'live'}
		</span>
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
.specimen { position: relative; border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 20px 16px 14px; background: var(--tl-color-panel); display: flex; flex-direction: column; gap: 12px; }
.specimen__badge { position: absolute; top: 8px; right: 8px; font-size: 9px; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.04em; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--tl-color-success, #2a9d3c) 16%, transparent); color: var(--tl-color-success, #2a9d3c); }
.specimen__badge[data-mock] { background: color-mix(in srgb, var(--tl-color-text-3) 18%, transparent); color: var(--tl-color-text-3); }
.specimen__stage { min-height: 56px; display: flex; align-items: center; justify-content: center; background: var(--tl-color-low); border-radius: 6px; padding: 12px; overflow: hidden; }
.specimen__label { font-size: 12px; font-weight: 600; font-family: ui-monospace, monospace; }
.specimen__code { font-size: 11px; line-height: 1.4; color: var(--tl-color-text-1); font-family: ui-monospace, monospace; background: var(--tl-color-low); border-radius: 4px; padding: 5px 7px; white-space: pre-wrap; word-break: break-word; }
.specimen__meta { font-size: 11px; line-height: 1.5; color: var(--tl-color-text-3); font-family: ui-monospace, monospace; }
.specimen__source { font-size: 10px; line-height: 1.5; color: var(--tl-color-text-3); font-family: ui-monospace, monospace; border-top: 1px dashed var(--tl-color-divider); padding-top: 8px; }
`

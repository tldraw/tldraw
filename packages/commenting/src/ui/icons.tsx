/* The commenting UI's inline icons, kept together so the set is visible in one place.
 *
 * Anything with an equivalent in tldraw's icon assets goes through `TldrawUiIcon` instead (the ⋯
 * menu, the dismiss cross, the resolve button's check). What's left lives here because the asset
 * set has no counterpart — a smiley, a send arrow, a filter — or because the asset reads wrong at
 * the size it's needed, which is the case for both resolved checks below. The eye pair mirrors
 * tldraw's presence glyphs: the open state is the `follow` icon — the almond eye whose pupil
 * tracks presence — and the closed state the `closed` icon, its shut-lid companion. Both are in
 * the asset set, but they're inlined because the package renders without an `AssetUrlsProvider`,
 * so `TldrawUiIcon` can't reach them. Inline also means they render without the consumer serving
 * files.
 *
 * All internal — none are exported from the package. */

/** The check inside a resolved comment pin. A drawn check, not the '✓' glyph — that character sits
 * off-baseline and varies by font. Heavier and rounder than `CheckIcon`: it has to hold its weight
 * against the pin's 28px filled face, where the asset check reads too light. */
export function PinCheckIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width="15"
			height="15"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 12.5l5 5L20 6.5" />
		</svg>
	)
}

/** The check beside the "Resolved" label on a comments list row. Thinner than `PinCheckIcon` — it
 * sits next to text at 12px, so it's drawn to match the label's weight rather than shout. */
export function CheckIcon() {
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
			<path
				d="M2.5 6.2 4.7 8.4 9.5 3.6"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

/** The reaction picker's trigger. */
export function SmileyIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
			<path
				d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82708 7.49972C1.82708 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82708 10.6327 1.82708 7.49972ZM5.03747 9.21395C4.87949 8.98746 4.56782 8.93193 4.34133 9.08991C4.11484 9.24789 4.05931 9.55956 4.21729 9.78605C4.93926 10.8211 6.14033 11.5 7.50004 11.5C8.85974 11.5 10.0608 10.8211 10.7828 9.78605C10.9408 9.55956 10.8852 9.24789 10.6587 9.08991C10.4323 8.93193 10.1206 8.98746 9.9626 9.21395C9.41963 9.99238 8.51907 10.5 7.50004 10.5C6.481 10.5 5.58044 9.99238 5.03747 9.21395ZM5.37503 6.84998C5.85828 6.84998 6.25003 6.45815 6.25003 5.97498C6.25003 5.4918 5.85828 5.09998 5.37503 5.09998C4.89179 5.09998 4.50003 5.4918 4.50003 5.97498C4.50003 6.45815 4.89179 6.84998 5.37503 6.84998ZM10.5 5.97498C10.5 6.45815 10.1083 6.84998 9.62503 6.84998C9.14179 6.84998 8.75003 6.45815 8.75003 5.97498C8.75003 5.4918 9.14179 5.09998 9.62503 5.09998C10.1083 5.09998 10.5 5.4918 10.5 5.97498Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

/** The composer's post button — an up arrow. */
export function SendIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
			<path
				d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

/** Comment pins are showing. tldraw's `follow` glyph (icons/icon/follow.svg) inlined at its native
 *  weight — the almond eye with a centred pupil. Pairs with `EyeClosedIcon`; the two must stay the
 *  same family. */
export function EyeOpenIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 30 30" fill="none" aria-hidden="true">
			<path fill="currentColor" d="M19 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0" />
			<path
				stroke="currentColor"
				strokeWidth="2"
				d="M26 15c0 1.77-1.077 3.496-3.07 4.825C20.946 21.149 18.145 22 15 22s-5.945-.851-7.93-2.175C5.076 18.496 4 16.77 4 15c0-1.77 1.077-3.496 3.07-4.825C9.054 8.851 11.855 8 15 8s5.945.851 7.93 2.175C24.924 11.504 26 13.23 26 15Z"
			/>
		</svg>
	)
}

/** Comment pins are hidden. tldraw's `closed` eye glyph (icons/icon/closed.svg) — a shut lower lid
 *  with lashes, the design pair to `follow`. Inlined like the open eye: the package renders without
 *  an `AssetUrlsProvider`. Lash dots are `r=1.5` (vs the asset's `r=1`) because at the 15px header
 *  size the asset's finer lashes fall below a pixel; the lid keeps `follow`'s native stroke. */
export function EyeClosedIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 30 30" fill="none" aria-hidden="true">
			<path
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				d="M27 15C27 19.4183 21.6274 23 15 23C8.37258 23 3 19.4183 3 15"
			/>
			<circle cx="4" cy="20" r="1.5" fill="currentColor" />
			<circle cx="9" cy="23" r="1.5" fill="currentColor" />
			<circle cx="15" cy="24" r="1.5" fill="currentColor" />
			<circle cx="21" cy="23" r="1.5" fill="currentColor" />
			<circle cx="26" cy="20" r="1.5" fill="currentColor" />
		</svg>
	)
}

/** The sidebar's comment-menu trigger — tldraw's `dots-vertical` glyph (icons/icon/dots-vertical.svg)
 *  inlined, a vertical kebab. Inlined like the eye pair because the package renders without an
 *  `AssetUrlsProvider`. */
export function MoreMenuIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 30 30" fill="none" aria-hidden="true">
			<path
				fill="currentColor"
				d="M15 9.48975C14.3167 9.48975 13.7292 9.24747 13.2375 8.76293C12.7458 8.27003 12.5 7.67688 12.5 6.98348C12.5 6.29843 12.7458 5.71364 13.2375 5.22909C13.7292 4.73619 14.3167 4.48975 15 4.48975C15.6833 4.48975 16.2708 4.73619 16.7625 5.22909C17.2542 5.71364 17.5 6.29843 17.5 6.98348C17.5 7.44296 17.3833 7.86485 17.15 8.24914C16.925 8.62508 16.625 8.92583 16.25 9.1514C15.875 9.37696 15.4583 9.48975 15 9.48975Z"
			/>
			<path
				fill="currentColor"
				d="M15 17.5C14.3167 17.5 13.7292 17.2577 13.2375 16.7732C12.7458 16.2803 12.5 15.6871 12.5 14.9937C12.5 14.3087 12.7458 13.7239 13.2375 13.2393C13.7292 12.7464 14.3167 12.5 15 12.5C15.6833 12.5 16.2708 12.7464 16.7625 13.2393C17.2542 13.7239 17.5 14.3087 17.5 14.9937C17.5 15.4532 17.3833 15.8751 17.15 16.2594C16.925 16.6353 16.625 16.9361 16.25 17.1617C15.875 17.3872 15.4583 17.5 15 17.5Z"
			/>
			<path
				fill="currentColor"
				d="M15 25.5103C14.3167 25.5103 13.7292 25.268 13.2375 24.7834C12.7458 24.2905 12.5 23.6974 12.5 23.004C12.5 22.319 12.7458 21.7342 13.2375 21.2496C13.7292 20.7567 14.3167 20.5103 15 20.5103C15.6833 20.5103 16.2708 20.7567 16.7625 21.2496C17.2542 21.7342 17.5 22.319 17.5 23.004C17.5 23.4635 17.3833 23.8854 17.15 24.2697C16.925 24.6456 16.625 24.9463 16.25 25.1719C15.875 25.3975 15.4583 25.5103 15 25.5103Z"
			/>
		</svg>
	)
}

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

/** Comment pins are showing. tldraw's `follow` glyph (icons/icon/follow.svg) inlined — the almond
 *  eye with a centred pupil. Pairs with `EyeClosedIcon`; the two must stay the same family. */
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
 *  an `AssetUrlsProvider`. */
export function EyeClosedIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 30 30" fill="none" aria-hidden="true">
			<path
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				d="M27 15C27 19.4183 21.6274 23 15 23C8.37258 23 3 19.4183 3 15"
			/>
			<circle cx="4" cy="20" r="1" fill="currentColor" />
			<circle cx="9" cy="23" r="1" fill="currentColor" />
			<circle cx="15" cy="24" r="1" fill="currentColor" />
			<circle cx="21" cy="23" r="1" fill="currentColor" />
			<circle cx="26" cy="20" r="1" fill="currentColor" />
		</svg>
	)
}

/** The sidebar's filter menu trigger. */
export function FilterIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
			<path
				d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM8 10.5C8 9.67157 8.67157 9 9.5 9C10.3284 9 11 9.67157 11 10.5C11 11.3284 10.3284 12 9.5 12C8.67157 12 8 11.3284 8 10.5Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

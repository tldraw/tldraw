import type { MentionNodeAttrs } from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionKeyDownProps, SuggestionOptions } from '@tiptap/suggestion'
import { type ReactNode, forwardRef, useImperativeHandle, useState } from 'react'
import { tlmenus } from 'tldraw'
import { MentionList, MentionMember } from './mention-list'

/** The handle the suggestion plugin drives — it forwards navigation keys into the popup. */
export interface MentionPopupHandle {
	onKeyDown(props: SuggestionKeyDownProps): boolean
}

interface MentionPopupProps {
	items: MentionMember[]
	command(attrs: MentionNodeAttrs): void
	renderMember?(member: MentionMember): ReactNode
}

/** The live @-picker popup: owns the highlighted index and keyboard, renders the presentational list. */
const MentionPopup = forwardRef<MentionPopupHandle, MentionPopupProps>(function MentionPopup(
	{ items, command, renderMember },
	ref
) {
	const [activeIndex, setActiveIndex] = useState(0)
	// A new query yields new items; reset the highlight to the top during render — not in an effect,
	// which would leave a frame where `activeIndex` still points past a shrunk list and Enter selects
	// its (now out-of-range, undefined) item, swallowing the key without inserting a mention.
	const [prevItems, setPrevItems] = useState(items)
	if (items !== prevItems) {
		setPrevItems(items)
		setActiveIndex(0)
	}

	const select = (member: MentionMember | undefined) => {
		if (member) command({ id: member.id, label: member.name })
	}

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }) => {
			if (items.length === 0) return false
			if (event.key === 'ArrowUp') {
				setActiveIndex((i) => (i + items.length - 1) % items.length)
				return true
			}
			if (event.key === 'ArrowDown') {
				setActiveIndex((i) => (i + 1) % items.length)
				return true
			}
			if (event.key === 'Enter') {
				// Fall back to the top match so Enter never selects `undefined` and swallows the key.
				select(items[activeIndex] ?? items[0])
				return true
			}
			return false
		},
	}))

	return (
		<MentionList
			members={items}
			activeIndex={activeIndex}
			onSelect={select}
			renderMember={renderMember}
		/>
	)
})

const MAX_SUGGESTIONS = 8

/** Members whose name contains the query (case-insensitive), capped to the popup's length. */
export function filterMentionMembers(members: MentionMember[], query: string): MentionMember[] {
	const q = query.toLowerCase()
	return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS)
}

// Registered in tldraw's open-menus registry while the picker shows, so it's tracked the same way
// as any other menu (reactive, and visible to dismissal) rather than through a bespoke flag.
const MENTION_PICKER_MENU_ID = 'comment-mention-picker'

/**
 * Whether the @-mention picker is currently showing. Host dismissal (Escape, outside-click) checks
 * this so it can defer to the picker instead of tearing down the composer or thread beneath it.
 */
export function isMentionPickerOpen(): boolean {
	return tlmenus.getOpenMenus().includes(MENTION_PICKER_MENU_ID)
}

export interface MentionSuggestionOptions {
	/** Override a member row's content in the picker. Defaults to avatar + name (+ secondary). */
	renderMember?(member: MentionMember): ReactNode
}

/**
 * Build the TipTap `suggestion` config for the comment @-picker. `getSuggestions(query)` is the
 * host's resolver — it returns the members matching the query (sync or async); the SDK owns neither
 * the roster nor the filtering. The plugin runs outside React, so `render` mounts `MentionPopup` via
 * a `ReactRenderer`, forwards navigation keys through the popup's imperative handle, and lets it call
 * `command` to insert.
 */
export function createMentionSuggestion(
	getSuggestions: (query: string) => MentionMember[] | Promise<MentionMember[]>,
	options: MentionSuggestionOptions = {}
): Omit<SuggestionOptions<MentionMember, MentionNodeAttrs>, 'editor'> {
	return {
		char: '@',
		items: ({ query }) => getSuggestions(query),
		render: () => {
			let renderer: ReactRenderer<MentionPopupHandle, MentionPopupProps> | null = null
			let container: HTMLElement | null = null
			let editorEl: HTMLElement | null = null
			let followFrame: number | null = null

			// Anchor the popup flush under the whole composer field (not the caret), matching its width.
			const place = () => {
				if (!container || !editorEl || container.style.display === 'none') return
				const field = editorEl.closest('.cmt-composer__field') ?? editorEl
				const rect = field.getBoundingClientRect()
				container.style.left = `${rect.left}px`
				container.style.top = `${rect.bottom + 4}px`
				container.style.width = `${rect.width}px`
			}

			// The popup is `position: fixed`, but its anchor — a canvas composer — rides the camera:
			// panning or zooming moves the composer with no scroll/resize event to hook. Re-anchor every
			// frame while the popup is mounted so it tracks the composer instead of stranding at stale
			// coordinates until the next keystroke.
			const startFollowing = () => {
				const tick = () => {
					place()
					followFrame = requestAnimationFrame(tick)
				}
				followFrame = requestAnimationFrame(tick)
			}
			const stopFollowing = () => {
				if (followFrame !== null) cancelAnimationFrame(followFrame)
				followFrame = null
			}

			// Dismiss the roster — on Escape, or when the composer loses focus — by hiding it and
			// clearing the open flag, so isMentionPickerOpen() stays accurate and the thread's own
			// Escape/outside-click dismissal can take over. The TipTap suggestion stays active, so typing
			// re-shows the roster via onUpdate.
			const hide = () => {
				if (container) container.style.display = 'none'
				tlmenus.deleteOpenMenu(MENTION_PICKER_MENU_ID)
			}

			return {
				onStart: (props) => {
					renderer = new ReactRenderer(MentionPopup, {
						props: {
							items: props.items,
							command: props.command,
							renderMember: options.renderMember,
						},
						editor: props.editor,
					})
					editorEl = props.editor.view.dom as HTMLElement
					// The TipTap suggestion has no blur handling, so without this the picker would stay
					// "open" (and the thread would defer its Escape to it) after focus moved away from the
					// composer — leaving Escape a no-op and the roster stuck on screen.
					editorEl.addEventListener('blur', hide)
					container = document.createElement('div')
					container.className = 'cmt-mention-popup'
					container.appendChild(renderer.element)
					// Mount inside the tldraw container so the popup inherits the theme variables
					// (--tl-color-*); portaling to document.body would strip them and lose the panel.
					const themed = editorEl.closest('.tl-container')
					;(themed ?? document.body).appendChild(container)
					place()
					startFollowing()
					tlmenus.addOpenMenu(MENTION_PICKER_MENU_ID)
				},
				onUpdate: (props) => {
					if (renderer)
						renderer.updateProps({
							items: props.items,
							command: props.command,
							renderMember: options.renderMember,
						})
					// Typing after an Escape re-shows the roster.
					if (container) container.style.display = ''
					tlmenus.addOpenMenu(MENTION_PICKER_MENU_ID)
					place()
				},
				onKeyDown: (props) => {
					// Once the roster is hidden (a prior Escape), the TipTap suggestion is still active but
					// this handler goes inert — every key passes through to the composer/thread (so a second
					// Escape closes them, and Arrow/Enter don't select from an invisible list). Typing
					// re-shows the roster via onUpdate.
					if (!isMentionPickerOpen()) return false
					if (props.event.key === 'Escape') {
						// Dismiss only the roster: hide it and stop the key so the composer/thread beneath
						// doesn't also treat Escape as "abandon".
						hide()
						props.event.stopPropagation()
						return true
					}
					if (renderer && renderer.ref) return renderer.ref.onKeyDown(props)
					return false
				},
				onExit: () => {
					stopFollowing()
					if (editorEl) editorEl.removeEventListener('blur', hide)
					if (container) container.remove()
					if (renderer) renderer.destroy()
					renderer = null
					container = null
					tlmenus.deleteOpenMenu(MENTION_PICKER_MENU_ID)
				},
			}
		},
	}
}

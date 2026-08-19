import type { MentionNodeAttrs } from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import { type ReactNode, forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { type Editor as TldrawEditor, atom, react, usePassThroughWheelEvents } from 'tldraw'
import { MentionList, MentionMember } from './mention-list'

/** The handle the suggestion plugin drives — it forwards navigation keys into the popup. */
interface MentionPopupHandle {
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
	// A wheel over the popup drives the canvas beneath it, the same pass-through every tldraw panel gets;
	// the hook leaves the list alone while it scrolls its own overflow. The suggestion plugin builds the
	// popup imperatively, but `ReactRenderer` portals this into the composer's tree, so context reaches it.
	const listRef = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(listRef)
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
			// Enter and Tab both complete the highlighted member (falling back to the top match so a
			// stale index never selects `undefined`). The empty-roster case is handled a level up, in
			// the suggestion's onKeyDown, which cancels the picker.
			if (event.key === 'Enter' || event.key === 'Tab') {
				select(items[activeIndex] ?? items[0])
				return true
			}
			return false
		},
	}))

	return (
		<MentionList
			ref={listRef}
			members={items}
			activeIndex={activeIndex}
			onSelect={select}
			renderMember={renderMember}
		/>
	)
})

const MAX_SUGGESTIONS = 8

/** Members whose name contains the query (case-insensitive), capped to the popup's length.
 * @public */
export function filterMentionMembers(members: MentionMember[], query: string): MentionMember[] {
	const q = query.toLowerCase()
	return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS)
}

// Deliberately NOT tldraw's open-menu registry: registering there mounts MenuClickCapture, which
// makes the canvas inert. The picker is an inline autocomplete, not a modal — the canvas must stay
// pannable beneath it — so track "open" ourselves.
const mentionPickerOpen = atom('isMentionPickerOpen', false)

/**
 * Whether the \@-mention picker is currently showing. Host dismissal (Escape, outside-click) checks
 * this so it can defer to the picker instead of tearing down the composer or thread beneath it.
 * @public
 */
export function isMentionPickerOpen(): boolean {
	return mentionPickerOpen.get()
}

/** @public */
export interface MentionSuggestionOptions {
	/** Override a member row's content in the picker. Defaults to avatar + name (+ secondary). */
	renderMember?(member: MentionMember): ReactNode
	/**
	 * The tldraw editor the composer lives in. When provided, the popup re-anchors reactively as the
	 * canvas camera moves (the composer rides it) instead of polling every frame. Omit off-canvas.
	 */
	editor?: TldrawEditor | null
}

/**
 * Build the TipTap `suggestion` config for the \@-picker. `getSuggestions(query)` is the host's
 * resolver — the SDK owns neither the roster nor the filtering. The plugin runs outside React, so
 * `render` mounts `MentionPopup` via a `ReactRenderer` and forwards navigation keys to it.
 * @public
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
			let stopCameraReaction: (() => void) | null = null
			// The composer field's top-left in page space, plus the popup's screen width. Captured on a
			// fresh read so camera moves can re-derive the popup's screen position from the page anchor
			// (see reposition) rather than the field's DOM rect.
			let anchorPage: { x: number; y: number } | null = null
			let popupWidth = 0

			const applyScreen = (left: number, top: number, width: number) => {
				if (!container) return
				container.style.left = `${left}px`
				container.style.top = `${top + 4}px`
				container.style.width = `${width}px`
			}

			// Fresh placement: read the field's real screen rect, position the popup flush under it (not
			// the caret, matching its width), and remember the field's page-space anchor for reposition.
			const place = () => {
				if (!container || !editorEl || container.style.display === 'none') return
				const field = editorEl.closest('.tlui-cmt-composer__field') ?? editorEl
				const rect = field.getBoundingClientRect()
				popupWidth = rect.width
				anchorPage = options.editor?.screenToPage({ x: rect.left, y: rect.bottom }) ?? null
				applyScreen(rect.left, rect.bottom, rect.width)
			}

			// Re-derived from the remembered page anchor — pure camera math, always current. Reading the field's
			// DOM rect would lag a frame: the composer re-positions on a React commit, after the camera reaction.
			const reposition = () => {
				if (!anchorPage || !options.editor) return
				const s = options.editor.pageToScreen(anchorPage)
				applyScreen(s.x, s.y, popupWidth)
			}

			// The popup is `position: fixed`, but a canvas composer rides the camera, which moves it with no
			// scroll/resize event to hook. Re-anchor from a tldraw reaction rather than polling every frame,
			// plus on window scroll/resize for the off-canvas case.
			const startFollowing = () => {
				window.addEventListener('scroll', place, true)
				window.addEventListener('resize', place)
				if (options.editor) {
					stopCameraReaction = react('anchor mention popup to camera', () => {
						options.editor!.getCamera() // track the camera so this re-runs as it moves
						reposition()
					})
				}
			}
			const stopFollowing = () => {
				window.removeEventListener('scroll', place, true)
				window.removeEventListener('resize', place)
				stopCameraReaction?.()
				stopCameraReaction = null
				anchorPage = null
			}

			// Dismiss the roster on Escape or blur, clearing the open flag so isMentionPickerOpen() stays
			// accurate and the thread's own dismissal can take over. Typing re-shows it via onUpdate.
			const hide = () => {
				if (container) container.style.display = 'none'
				mentionPickerOpen.set(false)
			}

			const popupProps = (
				props: SuggestionProps<MentionMember, MentionNodeAttrs>
			): MentionPopupProps => ({
				items: props.items,
				command: props.command,
				renderMember: options.renderMember,
			})

			return {
				onStart: (props) => {
					renderer = new ReactRenderer(MentionPopup, {
						props: popupProps(props),
						editor: props.editor,
					})
					editorEl = props.editor.view.dom as HTMLElement
					// The TipTap suggestion has no blur handling, so without this the picker would stay
					// "open" (and the thread would defer its Escape to it) after focus moved away from the
					// composer — leaving Escape a no-op and the roster stuck on screen.
					editorEl.addEventListener('blur', hide)
					container = document.createElement('div')
					container.className = 'tlui-cmt-mention-popup'
					container.appendChild(renderer.element)
					// Mounted inside the tldraw container so the popup inherits the theme variables and the pass-through
					// hooks can find the canvas. Outside one, fall back to the body — the picker still works.
					;(editorEl.closest('.tl-container') ?? document.body).appendChild(container)
					place()
					startFollowing()
					mentionPickerOpen.set(true)
				},
				onUpdate: (props) => {
					renderer?.updateProps(popupProps(props))
					// Typing after an Escape re-shows the roster.
					if (container) container.style.display = ''
					mentionPickerOpen.set(true)
					place()
				},
				onKeyDown: (props) => {
					// Once the roster is hidden, the suggestion stays active but this handler goes inert — keys pass
					// through so a second Escape closes the composer. Typing re-shows the roster via onUpdate.
					if (!isMentionPickerOpen()) return false
					if (props.event.key === 'Escape') {
						// Dismiss only the roster: hide it and stop the key so the composer/thread beneath
						// doesn't also treat Escape as "abandon".
						hide()
						props.event.stopPropagation()
						return true
					}
					if (props.event.key === 'Enter' || props.event.key === 'Tab') {
						// Complete the highlighted member if there is one to complete; if the roster is empty
						// there's nothing to pick, so cancel the picker and swallow the key — the composer
						// beneath neither submits (Enter) nor moves focus / indents (Tab).
						const completed = renderer?.ref?.onKeyDown(props) ?? false
						if (!completed) {
							hide()
							props.event.stopPropagation()
						}
						return true
					}
					return renderer?.ref?.onKeyDown(props) ?? false
				},
				onExit: () => {
					stopFollowing()
					editorEl?.removeEventListener('blur', hide)
					container?.remove()
					renderer?.destroy()
					renderer = null
					container = null
					mentionPickerOpen.set(false)
				},
			}
		},
	}
}

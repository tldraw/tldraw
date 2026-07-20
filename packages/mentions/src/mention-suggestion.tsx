import type { Editor as TiptapEditor } from '@tiptap/core'
import type { MentionNodeAttrs } from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionKeyDownProps, SuggestionOptions } from '@tiptap/suggestion'
import { createElement, type ReactNode, forwardRef, useImperativeHandle, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Editor as TldrawEditor, atom, react } from 'tldraw'
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
			members={items}
			activeIndex={activeIndex}
			onSelect={select}
			renderMember={renderMember}
		/>
	)
})

const MAX_SUGGESTIONS = 8

// The popup matches its anchor's width — right for the wide comment composer field, but a shape's
// text can be just a few characters, which would clip the member names. Never render it narrower
// than this so the roster stays readable regardless of the anchor.
const MIN_POPUP_WIDTH = 220

/** Members whose name contains the query (case-insensitive), capped to the popup's length.
 * @public */
export function filterMentionMembers(members: MentionMember[], query: string): MentionMember[] {
	const q = query.toLowerCase()
	return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS)
}

/** A mounted popup: its DOM element, a way to push new props, its keyboard handle, and teardown. */
interface PopupRenderer {
	element: HTMLElement
	update(props: MentionPopupProps): void
	getHandle(): MentionPopupHandle | null
	destroy(): void
}

/**
 * Mount the popup component and return a handle to it.
 *
 * `@tiptap/react`'s `ReactRenderer` only renders the component when the editor has a
 * `contentComponent` — the React bridge that `useEditor`/`EditorContent` install. The comment
 * composer is built that way, so its popup renders (and keeps tldraw's UI context) through that
 * bridge. But shape rich text builds its TipTap editor imperatively with `new Editor()` (see
 * `RichTextArea`), so it has no `contentComponent` and `ReactRenderer` would append an empty node.
 * There we render the popup with a standalone React root instead, which renders regardless of how
 * the editor was created; `useTranslation` simply falls back to its default messages off-tree.
 */
function createPopupRenderer(editor: TiptapEditor, initialProps: MentionPopupProps): PopupRenderer {
	if ((editor as { contentComponent?: unknown }).contentComponent) {
		const rr = new ReactRenderer<MentionPopupHandle, MentionPopupProps>(MentionPopup, {
			props: initialProps,
			editor,
		})
		return {
			element: rr.element as HTMLElement,
			update: (props) => rr.updateProps(props),
			getHandle: () => rr.ref ?? null,
			destroy: () => rr.destroy(),
		}
	}
	const element = document.createElement('div')
	element.className = 'react-renderer'
	const root = createRoot(element)
	let handle: MentionPopupHandle | null = null
	// A stable ref callback so re-renders don't detach/reattach (which would drop the handle mid-key).
	const setHandle = (h: MentionPopupHandle | null) => {
		handle = h
	}
	let props = initialProps
	const render = () => root.render(createElement(MentionPopup, { ...props, ref: setHandle }))
	render()
	return {
		element,
		update: (next) => {
			props = next
			render()
		},
		getHandle: () => handle,
		destroy: () => root.unmount(),
	}
}

// A reactive flag for whether the @-picker is showing. Deliberately NOT tldraw's open-menu registry:
// registering there mounts MenuClickCapture, which covers the canvas with a click-capture overlay to
// make it inert while a menu is open. But the picker is an inline autocomplete, not a modal — the
// canvas must stay pannable/zoomable beneath it — so we track "open" ourselves instead.
const mentionPickerOpen = atom('isMentionPickerOpen', false)

/**
 * Whether the \@-mention picker is currently showing. Host dismissal (Escape, outside-click) checks
 * this so it can defer to the picker instead of tearing down the composer, thread, or editing shape
 * beneath it.
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
 * resolver — it returns the members matching the query (sync or async); the SDK owns neither the
 * roster nor the filtering. The plugin runs outside React, so `render` mounts `MentionPopup` via a
 * `ReactRenderer`, forwards navigation keys through the popup's imperative handle, and lets it call
 * `command` to insert.
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
			let renderer: PopupRenderer | null = null
			let container: HTMLElement | null = null
			let editorEl: HTMLElement | null = null
			let canvasEl: Element | null = null
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
			// Off the comment composer (e.g. a shape's rich-text editor) there's no `.tlui-cmt-composer__field`,
			// so it falls back to the editor's own DOM element and anchors under that.
			const place = () => {
				if (!container || !editorEl || container.style.display === 'none') return
				const field = editorEl.closest('.tlui-cmt-composer__field') ?? editorEl
				const rect = field.getBoundingClientRect()
				popupWidth = Math.max(rect.width, MIN_POPUP_WIDTH)
				anchorPage = options.editor?.screenToPage({ x: rect.left, y: rect.bottom }) ?? null
				applyScreen(rect.left, rect.bottom, popupWidth)
			}

			// Re-derive the popup's screen position from the remembered page anchor — pure camera math,
			// always current. Reading the field's DOM rect here instead would lag by a frame: the canvas
			// composer re-positions itself on a React commit (a `useValue(pageToViewport(...))`), which
			// lands after a camera reaction runs, so the rect is still last frame's during a pan.
			const reposition = () => {
				if (!anchorPage || !options.editor) return
				const s = options.editor.pageToScreen(anchorPage)
				applyScreen(s.x, s.y, popupWidth)
			}

			// The popup is `position: fixed`, but its anchor — a canvas composer or an editing shape —
			// rides the camera: panning or zooming moves it with no scroll/resize event to hook.
			// Re-anchor when the camera actually changes (via a tldraw reaction) rather than polling every
			// frame, plus on window scroll/resize for the off-canvas case (which re-read the field directly).
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

			// Dismiss the roster — on Escape, or when the composer loses focus — by hiding it and
			// clearing the open flag, so isMentionPickerOpen() stays accurate and the thread's own
			// Escape/outside-click dismissal can take over. The TipTap suggestion stays active, so typing
			// re-shows the roster via onUpdate.
			const hide = () => {
				if (container) container.style.display = 'none'
				mentionPickerOpen.set(false)
			}

			// Wheel/panning over the popup drives the canvas beneath it, so scrolling to pan or zoom
			// isn't swallowed by the roster — the same passthrough the rest of the comments UI gets from
			// `usePassThroughWheelEvents`. The list still scrolls itself when the roster overflows (we
			// only redispatch when it can't). Done imperatively because the popup lives outside React.
			const onWheel = (e: WheelEvent) => {
				if ((e as any).isSpecialRedispatchedEvent || !canvasEl) return
				const list = container?.querySelector('.tlui-cmt-mention-list')
				if (list && list.scrollHeight > list.clientHeight) return
				e.preventDefault()
				const redispatched = new WheelEvent('wheel', e)
				;(redispatched as any).isSpecialRedispatchedEvent = true
				canvasEl.dispatchEvent(redispatched)
			}

			return {
				onStart: (props) => {
					renderer = createPopupRenderer(props.editor, {
						items: props.items,
						command: props.command,
						renderMember: options.renderMember,
					})
					editorEl = props.editor.view.dom as HTMLElement
					// The TipTap suggestion has no blur handling, so without this the picker would stay
					// "open" (and the thread would defer its Escape to it) after focus moved away from the
					// composer — leaving Escape a no-op and the roster stuck on screen.
					editorEl.addEventListener('blur', hide)
					container = document.createElement('div')
					container.className = 'tlui-cmt-mention-popup'
					container.appendChild(renderer.element)
					// Mount inside the tldraw container so the popup inherits the theme variables
					// (--tl-color-*); portaling to document.body would strip them and lose the panel.
					const themed = editorEl.closest('.tl-container')
					;(themed ?? document.body).appendChild(container)
					canvasEl = themed?.querySelector('.tl-canvas') ?? null
					container.addEventListener('wheel', onWheel, { passive: false })
					place()
					startFollowing()
					mentionPickerOpen.set(true)
				},
				onUpdate: (props) => {
					if (renderer)
						renderer.update({
							items: props.items,
							command: props.command,
							renderMember: options.renderMember,
						})
					// Typing after an Escape re-shows the roster.
					if (container) container.style.display = ''
					mentionPickerOpen.set(true)
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
					if (props.event.key === 'Enter' || props.event.key === 'Tab') {
						// Complete the highlighted member if there is one to complete; if the roster is empty
						// there's nothing to pick, so cancel the picker and swallow the key — the composer
						// beneath neither submits (Enter) nor moves focus / indents (Tab).
						const completed = renderer?.getHandle()?.onKeyDown(props) ?? false
						if (!completed) {
							hide()
							props.event.stopPropagation()
						}
						return true
					}
					const handle = renderer?.getHandle()
					if (handle) return handle.onKeyDown(props)
					return false
				},
				onExit: () => {
					stopFollowing()
					if (editorEl) editorEl.removeEventListener('blur', hide)
					if (container) container.removeEventListener('wheel', onWheel)
					if (container) container.remove()
					if (renderer) renderer.destroy()
					renderer = null
					container = null
					canvasEl = null
					mentionPickerOpen.set(false)
				},
			}
		},
	}
}

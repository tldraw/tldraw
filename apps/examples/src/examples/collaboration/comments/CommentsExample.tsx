import { useEffect, useMemo, useRef, useState } from 'react'
import {
	CustomRecordInfo,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	StateNode,
	T,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	Vec,
	atom,
	createCustomRecordId,
	createTLStore,
	isCustomRecord,
	react,
	track,
	useEditor,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './comments.css'

// There's a guide at the bottom of this file!

// [1]
const THREAD_TYPE = 'commentThread'
const REPLY_TYPE = 'commentReply'

interface CommentThread {
	id: string
	typeName: typeof THREAD_TYPE
	x: number
	y: number
	authorId: string
	authorName: string
	authorColor: string
	createdAt: number
}

interface CommentReply {
	id: string
	typeName: typeof REPLY_TYPE
	threadId: string
	authorId: string
	authorName: string
	authorColor: string
	text: string
	createdAt: number
	edited: boolean
}

const threadRecord: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal(THREAD_TYPE),
		x: T.number,
		y: T.number,
		authorId: T.string,
		authorName: T.string,
		authorColor: T.string,
		createdAt: T.number,
	}),
}

const replyRecord: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal(REPLY_TYPE),
		threadId: T.string,
		authorId: T.string,
		authorName: T.string,
		authorColor: T.string,
		text: T.string,
		createdAt: T.number,
		edited: T.boolean,
	}),
}

// [2] Shared UI state. These are tldraw signals, so `track`ed components react to them.
const openThreadId = atom<string | null>('openThreadId', null)
const hoveredThreadId = atom<string | null>('hoveredThreadId', null)
const composerText = atom('composerText', '')
const editingReplyId = atom<string | null>('editingReplyId', null)
const toastState = atom<{ id: number; title: string; onUndo(): void } | null>('toast', null)
let toastCounter = 0

// [3] Helpers
function getAuthor(editor: Editor) {
	return {
		authorId: editor.user.getExternalId(),
		authorName: editor.user.getName() || 'Anonymous',
		authorColor: editor.user.getColor(),
	}
}

function getThreads(editor: Editor) {
	return editor.store
		.allRecords()
		.filter((r) => isCustomRecord(THREAD_TYPE, r)) as any as CommentThread[]
}

function getReplies(editor: Editor, threadId: string) {
	return (
		editor.store.allRecords().filter((r) => isCustomRecord(REPLY_TYPE, r)) as any as CommentReply[]
	)
		.filter((r) => r.threadId === threadId)
		.sort((a, b) => a.createdAt - b.createdAt)
}

// Open a thread, discarding the previously open thread if it was an empty draft.
function openThread(editor: Editor, id: string | null) {
	const prev = openThreadId.get()
	if (prev && prev !== id && getReplies(editor, prev).length === 0) {
		editor.store.remove([prev as any])
	}
	composerText.set('')
	openThreadId.set(id)
}

function sendReply(editor: Editor, threadId: string) {
	const text = composerText.get().trim()
	if (!text) return
	editor.store.put([
		{
			id: createCustomRecordId(REPLY_TYPE),
			typeName: REPLY_TYPE,
			threadId,
			...getAuthor(editor),
			text,
			createdAt: Date.now(),
			edited: false,
		} as any,
	])
	composerText.set('')
}

// Clicking the canvas dismisses the thread; for a draft this also submits the text (like Enter).
function dismissOpenThread(editor: Editor) {
	const id = openThreadId.get()
	if (!id) return
	sendReply(editor, id)
	if (getReplies(editor, id).length === 0) {
		editor.store.remove([id as any])
	}
	openThreadId.set(null)
}

function showToast(title: string, onUndo: () => void) {
	toastCounter++
	toastState.set({ id: toastCounter, title, onUndo })
}

function formatTime(ms: number) {
	const seconds = Math.round((Date.now() - ms) / 1000)
	if (seconds < 60) return 'just now'
	const minutes = Math.round(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	return new Date(ms).toLocaleDateString()
}

// The pin is a 32px teardrop anchored with its bottom-left corner at the page point.
const PIN_SIZE = 32

// Panels anchor to the top of the pin, just to its right.
function panelStyle(editor: Editor, thread: CommentThread) {
	const point = editor.pageToViewport(new Vec(thread.x, thread.y))
	return { left: point.x + PIN_SIZE + 8, top: point.y - PIN_SIZE }
}

// [4] The comment tool: click the canvas to drop a thread, then start composing.
class CommentTool extends StateNode {
	static override id = 'comment'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const point = this.editor.inputs.getCurrentPagePoint()
		const id = createCustomRecordId(THREAD_TYPE)
		this.editor.store.put([
			{
				id,
				typeName: THREAD_TYPE,
				x: point.x,
				y: point.y,
				...getAuthor(this.editor),
				createdAt: Date.now(),
			} as any,
		])
		composerText.set('')
		openThreadId.set(id)
		this.editor.setCurrentTool('select')
	}
}

// [5] Inline icons (single-color, currentColor — match tldraw's line-icon look)
const stroke = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
} as const
const IconClose = () => (
	<svg viewBox="0 0 24 24" {...stroke}>
		<path d="M18 6 6 18M6 6l12 12" />
	</svg>
)
const IconResolve = () => (
	<svg viewBox="0 0 24 24" {...stroke}>
		<circle cx="12" cy="12" r="9" />
		<path d="m8.5 12 2.5 2.5 4.5-5" />
	</svg>
)
const IconDots = () => (
	<svg viewBox="0 0 24 24" fill="currentColor">
		<circle cx="5" cy="12" r="1.6" />
		<circle cx="12" cy="12" r="1.6" />
		<circle cx="19" cy="12" r="1.6" />
	</svg>
)

function Avatar({ name, color }: { name: string; color: string }) {
	return (
		<div className="tlcomments-avatar" style={{ backgroundColor: color }}>
			{name.charAt(0).toUpperCase()}
		</div>
	)
}

// [6] The shared composer — used for the first comment and for replies.
const Composer = track(function Composer({
	thread,
	placeholder,
	autoFocus,
}: {
	thread: CommentThread
	placeholder: string
	autoFocus: boolean
}) {
	const editor = useEditor()
	const ref = useRef<HTMLTextAreaElement>(null)
	const text = composerText.get()

	// The editor can take focus back after the placing click, so focus over a few ticks.
	useEffect(() => {
		if (!autoFocus) return
		const el = ref.current
		if (!el) return
		el.focus()
		const raf = requestAnimationFrame(() => el.focus())
		const timeout = setTimeout(() => el.focus(), 80)
		return () => {
			cancelAnimationFrame(raf)
			clearTimeout(timeout)
		}
	}, [autoFocus])

	return (
		<div className="tlcomments-composer">
			<textarea
				ref={ref}
				className="tlcomments-textarea"
				rows={1}
				value={text}
				placeholder={placeholder}
				onChange={(e) => composerText.set(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault()
						sendReply(editor, thread.id)
					}
				}}
			/>
			<button
				className="tlcomments-btn tlcomments-btn--primary"
				disabled={!text.trim()}
				onClick={() => sendReply(editor, thread.id)}
			>
				Send
			</button>
		</div>
	)
})

// [7] A reply's "..." menu, with edit and delete. It positions itself with fixed
// coordinates so it isn't clipped by the panel's rounded overflow.
function MessageMenu({ reply }: { reply: CommentReply }) {
	const editor = useEditor()
	const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

	function toggle(e: React.MouseEvent) {
		if (pos) return setPos(null)
		const r = e.currentTarget.getBoundingClientRect()
		setPos({ x: r.right, y: r.bottom + 4 })
	}

	return (
		<>
			<button className="tlcomments-iconbtn" aria-label="More" onClick={toggle}>
				<IconDots />
			</button>
			{pos && (
				<>
					<div className="tlcomments-menu-backdrop" onPointerDown={() => setPos(null)} />
					<div className="tlcomments-menu" style={{ left: pos.x, top: pos.y }}>
						<button
							className="tlcomments-menu-item"
							onClick={() => {
								editingReplyId.set(reply.id)
								setPos(null)
							}}
						>
							Edit
						</button>
						<button
							className="tlcomments-menu-item"
							onClick={() => {
								editor.store.remove([reply.id as any])
								setPos(null)
							}}
						>
							Delete
						</button>
					</div>
				</>
			)}
		</>
	)
}

// Inline editor shown in place of the message text while editing.
function MessageEditor({ reply }: { reply: CommentReply }) {
	const editor = useEditor()
	const [value, setValue] = useState(reply.text)

	function save() {
		const text = value.trim()
		if (text && text !== reply.text) {
			editor.store.update(reply.id as any, (r) => ({ ...r, text, edited: true }) as any)
		}
		editingReplyId.set(null)
	}

	return (
		<div className="tlcomments-edit">
			<textarea
				className="tlcomments-edit-textarea"
				autoFocus
				rows={2}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault()
						save()
					} else if (e.key === 'Escape') {
						editingReplyId.set(null)
					}
				}}
			/>
			<div className="tlcomments-edit-actions">
				<button className="tlcomments-btn" onClick={() => editingReplyId.set(null)}>
					Cancel
				</button>
				<button className="tlcomments-btn tlcomments-btn--primary" onClick={save}>
					Save
				</button>
			</div>
		</div>
	)
}

// [8] One reply row.
const MessageRow = track(function MessageRow({ reply }: { reply: CommentReply }) {
	const editor = useEditor()
	const isMine = reply.authorId === editor.user.getExternalId()
	const editing = editingReplyId.get() === reply.id
	return (
		<div className="tlcomments-msg">
			<Avatar name={reply.authorName} color={reply.authorColor} />
			<div className="tlcomments-msg-body">
				<div className="tlcomments-msg-head">
					<span className="tlcomments-author">{reply.authorName}</span>
					<span className="tlcomments-time">{formatTime(reply.createdAt)}</span>
					{reply.edited && <span className="tlcomments-edited">(edited)</span>}
					<div className="tlcomments-head-spacer" />
					{isMine && !editing && <MessageMenu reply={reply} />}
				</div>
				{editing ? (
					<MessageEditor reply={reply} />
				) : (
					<div className="tlcomments-text">{reply.text}</div>
				)}
			</div>
		</div>
	)
})

// [8] The open thread: composer-only while drafting, full thread once it has replies.
const ThreadPopover = track(function ThreadPopover({ thread }: { thread: CommentThread }) {
	const editor = useEditor()
	const replies = getReplies(editor, thread.id)
	const style = panelStyle(editor, thread)

	// Drafting a brand-new comment: just the composer.
	if (replies.length === 0) {
		return (
			<div className="tlcomments-panel tlcomments-popover" style={style}>
				<Composer thread={thread} placeholder="Add a comment…" autoFocus />
			</div>
		)
	}

	// Resolving deletes the thread; the toast offers to restore it.
	function resolve() {
		const snapshot = [thread, ...replies]
		editor.store.remove([thread.id as any, ...replies.map((r) => r.id as any)])
		openThreadId.set(null)
		showToast('Comment resolved', () => editor.store.put(snapshot as any))
	}

	return (
		<div className="tlcomments-panel tlcomments-popover" style={style}>
			<div className="tlcomments-header">
				<span className="tlcomments-title">Comments</span>
				<button className="tlcomments-iconbtn" aria-label="Resolve" onClick={resolve}>
					<IconResolve />
				</button>
				<button
					className="tlcomments-iconbtn"
					aria-label="Close"
					onClick={() => openThread(editor, null)}
				>
					<IconClose />
				</button>
			</div>
			<div className="tlcomments-messages">
				{replies.map((reply) => (
					<MessageRow key={reply.id} reply={reply} />
				))}
			</div>
			<Composer thread={thread} placeholder="Reply…" autoFocus={false} />
		</div>
	)
})

// [9] Compact preview shown when hovering a pin (only while the camera is still).
const HoverPreview = track(function HoverPreview({ thread }: { thread: CommentThread }) {
	const editor = useEditor()
	const first = getReplies(editor, thread.id)[0]
	if (!first) return null
	return (
		<div className="tlcomments-panel tlcomments-preview" style={panelStyle(editor, thread)}>
			<div className="tlcomments-msg">
				<Avatar name={first.authorName} color={first.authorColor} />
				<div className="tlcomments-msg-body">
					<div className="tlcomments-msg-head">
						<span className="tlcomments-author">{first.authorName}</span>
						<span className="tlcomments-time">{formatTime(first.createdAt)}</span>
					</div>
					<div className="tlcomments-text">{first.text}</div>
				</div>
			</div>
		</div>
	)
})

// [10] A small toast that carries a single Undo action.
const CommentToast = track(function CommentToast() {
	const toast = toastState.get()
	useEffect(() => {
		if (!toast) return
		const timeout = setTimeout(() => toastState.set(null), 5000)
		return () => clearTimeout(timeout)
	}, [toast])
	if (!toast) return null
	return (
		<div className="tlcomments-toast">
			<span className="tlcomments-toast-title">{toast.title}</span>
			<button
				className="tlcomments-toast-undo"
				onClick={() => {
					toast.onUndo()
					toastState.set(null)
				}}
			>
				Undo
			</button>
		</div>
	)
})

// [11] The layer that renders all pins and the active popover/preview.
const CommentsLayer = track(function CommentsLayer() {
	const editor = useEditor()
	const openId = openThreadId.get()
	const hoverId = hoveredThreadId.get()
	const threads = getThreads(editor)
	const openThreadRecord = threads.find((t) => t.id === openId) ?? null

	// Any camera change clears the hover, so a preview only ever returns when the user
	// actually moves the mouse onto a pin on a still canvas — never mid-pan.
	useEffect(() => {
		const stop = react('clear-hover-on-camera', () => {
			editor.getCamera() // subscribe to camera changes
			hoveredThreadId.set(null)
		})
		return () => stop()
	}, [editor])

	const hoverThread =
		hoverId !== null && hoverId !== openId ? threads.find((t) => t.id === hoverId) : null

	return (
		<div className="tlcomments-layer">
			{openThreadRecord && (
				<div className="tlcomments-backdrop" onPointerDown={() => dismissOpenThread(editor)} />
			)}

			{/* Preview renders behind the pins so the pin sits on top of it. */}
			{hoverThread && <HoverPreview thread={hoverThread} />}

			{threads.map((thread) => {
				const point = editor.pageToViewport(new Vec(thread.x, thread.y))
				return (
					<button
						key={thread.id}
						className={'tlcomments-pin' + (thread.id === openId ? ' tlcomments-pin--active' : '')}
						style={{ left: point.x, top: point.y }}
						aria-label="Open comment thread"
						onPointerDown={(e) => e.stopPropagation()}
						onPointerEnter={() => hoveredThreadId.set(thread.id)}
						onPointerLeave={() => hoveredThreadId.set(null)}
						onClick={() => openThread(editor, thread.id === openId ? null : thread.id)}
					/>
				)
			})}

			{openThreadRecord && <ThreadPopover thread={openThreadRecord} />}
			<CommentToast />
		</div>
	)
})

// [12] Register the tool in the UI.
const COMMENT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>`
)}`

const assetUrls: TLUiAssetUrlOverrides = {
	icons: { 'comment-tool': COMMENT_ICON },
}

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.comment = {
			id: 'comment',
			icon: 'comment-tool',
			label: 'Comment',
			kbd: 'c',
			onSelect: () => editor.setCurrentTool('comment'),
		}
		return tools
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools['comment'])
		return (
			<DefaultToolbar {...props}>
				<DefaultToolbarContent />
				<TldrawUiMenuItem {...tools['comment']} isSelected={isSelected} />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['comment']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
	InFrontOfTheCanvas: CommentsLayer,
}

const customTools = [CommentTool]

// [13]
export default function CommentsExample() {
	const store = useMemo(
		() =>
			createTLStore({
				records: { [THREAD_TYPE]: threadRecord, [REPLY_TYPE]: replyRecord },
			}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				tools={customTools}
				overrides={uiOverrides}
				components={components}
				assetUrls={assetUrls}
			/>
		</div>
	)
}

/*
Introduction:

This example builds a Figma-like commenting system on top of tldraw's custom
records, using a real toolbar tool and tldraw's own design tokens so it matches
the editor in both light and dark mode.

Select the comment tool from the toolbar (or press C), then click the canvas to
drop a pin and start typing right away. Click a pin to open its thread, hover a pin
(while the canvas is still) to preview it, reply, or resolve. Clicking the canvas
submits a draft and closes the thread. Pins stick to their point in page space as
you pan and zoom.

Because the data lives in document-scoped custom records, it persists and syncs
through the same pipeline as shapes — drop this store into a synced store (see the
sync examples / `useSync`) and comments become multiplayer automatically.

[1] Two record types: a `commentThread` (a pin anchored at a page point) and a
`commentReply` (one message in a thread). Keeping them separate means concurrent
replies never clobber each other.

[2] Shared UI state lives in tldraw `atom`s so any `track`ed component reacts to it:
which thread is open/hovered, the composer's text (so a canvas click can submit it),
whether the camera is moving, and the current toast.

[3] Helpers read the current user from `editor.user` and query threads/replies.
`dismissOpenThread` submits any draft text (like pressing Enter) and discards an
empty draft. `panelStyle` anchors a panel to the top of its pin.

[4] `CommentTool` is a `StateNode`. On pointer down it creates a thread at the
current page point and opens it for editing, then switches back to the select tool.

[5] Small inline single-color icons drawn with `currentColor`.

[6] `Composer` puts the input and send button on one row. Enter sends; Shift+Enter
adds a newline. It focuses itself over a few ticks because the editor can reclaim
focus right after the placing click.

[7-8] The thread popover. While a thread has no replies it shows just the composer
(the "creating" state); once it has replies it shows the header (resolve and close),
the messages, and the composer. Resolving deletes the thread and shows a toast that
can restore it.

[9] The hover preview is a non-interactive peek that grows out of the pin. It only
shows while the camera is still — see [11].

[10-11] The toast and the layer that positions every pin with `pageToViewport` so
they track the camera. A `react` effect flags the camera as moving for a beat after
any change, so previews never appear (or interrupt) mid-pan. The open thread adds a
full-canvas backdrop so a canvas click dismisses it.

[12] The tool is registered with the `tools` prop, added to the toolbar and
keyboard-shortcuts dialog via component overrides, and given a custom icon through
`assetUrls` (an inline SVG data URI rendered as a mask, like tldraw's own icons).

[13] Finally we create the store with both record types and pass everything to
`Tldraw`.
*/

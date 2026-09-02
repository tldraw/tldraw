import { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import {
	Avatar,
	type CommentAuthor,
	createMentionExtension,
	createMentionSuggestion,
	isMentionPickerOpen,
	MentionMember,
} from '@tldraw/mentions'
import {
	type MouseEvent as ReactMouseEvent,
	ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { isEqual, TLRichText, useMaybeEditor } from 'tldraw'
import { commentTipTapExtensions, EMPTY_COMMENT, isCommentEmpty } from './comment-extensions'
import { SendButton } from './send-button'

/** @public */
export interface CommentComposerProps {
	author: CommentAuthor
	placeholder: string
	/** Controlled rich-text value. Omit for the presentational (display-only) composer. */
	value?: TLRichText
	onChange?(value: TLRichText): void
	/** Called on Send click or Enter. When set, the composer is interactive. */
	onSubmit?(): void
	sendLabel?: string
	/** Called when Up is pressed in an empty composer — e.g. to start editing the comment above,
	 *  the way chat apps edit your last message. With content in the field, Up moves the cursor. */
	onArrowUpWhenEmpty?(): void
	disabled?: boolean
	autoFocus?: boolean
	/** The leading element before the field. Defaults to the author's avatar. */
	leading?: ReactNode
	/** Resolve the members matching an `@`-query (sync or async). Provide to enable mentions. */
	getMentionSuggestions?(query: string): MentionMember[] | Promise<MentionMember[]>
	/** Override a picker row's content. Defaults to avatar + name (+ secondary). */
	renderMentionSuggestion?(member: MentionMember): ReactNode
}

/**
 * The input for writing a comment: a TipTap rich-text editor restricted to the comment extension
 * set (bold, italic, lists, links, code, highlight — no headings), with a Send button. Formatting
 * is applied through markdown and keyboard shortcuts (e.g. `**bold**`, `- `, Cmd+B); there's no
 * floating toolbar. Presentational by default; pass value/onChange/onSubmit to drive it as a form.
 * @public @react
 */
export function CommentComposer({
	author,
	placeholder,
	value,
	onChange,
	onSubmit,
	sendLabel = 'Send',
	onArrowUpWhenEmpty,
	disabled,
	autoFocus,
	leading,
	getMentionSuggestions,
	renderMentionSuggestion,
}: CommentComposerProps) {
	const interactive = !!onChange || !!onSubmit
	// Lets the mention popup track the camera. Null outside a tldraw editor.
	const tlEditor = useMaybeEditor()

	// Read through refs so the editor isn't recreated when callback identity changes.
	const onChangeRef = useRef(onChange)
	onChangeRef.current = onChange
	const onSubmitRef = useRef(onSubmit)
	onSubmitRef.current = onSubmit
	const onArrowUpWhenEmptyRef = useRef(onArrowUpWhenEmpty)
	onArrowUpWhenEmptyRef.current = onArrowUpWhenEmpty
	const disabledRef = useRef(disabled)
	disabledRef.current = disabled
	const getMentionSuggestionsRef = useRef(getMentionSuggestions)
	getMentionSuggestionsRef.current = getMentionSuggestions
	const renderMentionSuggestionRef = useRef(renderMentionSuggestion)
	renderMentionSuggestionRef.current = renderMentionSuggestion

	const [isEmpty, setIsEmpty] = useState(() => !value || isCommentEmpty(value))
	// Whether the field has grown to two rows: input across the full width, send button below.
	// Flips when the (single-line) content width reaches the space left beside the send button.
	const [expanded, setExpanded] = useState(false)
	const expandedRef = useRef(expanded)
	expandedRef.current = expanded
	const inputWrapRef = useRef<HTMLDivElement>(null)
	const mirrorRef = useRef<HTMLDivElement>(null)

	// Measure whether the content still fits on one line beside the send button, against a hidden
	// nowrap clone so marks and mention chips measure at their true width. The gap between the
	// expand and collapse thresholds is a dead zone, so the layout can't flap at the boundary.
	const remeasure = () => {
		const wrap = inputWrapRef.current
		const mirror = mirrorRef.current
		const editor = editorRef.current
		if (!wrap || !mirror || !editor) return
		// Empty always fits — and measuring before TipTap has laid out reads zero widths, flashing
		// the expanded layout for a frame on mount.
		if (editor.isEmpty) {
			if (expandedRef.current) setExpanded(false)
			return
		}
		if (wrap.clientWidth === 0) return
		const doc = editor.state.doc
		const multiBlock =
			doc.childCount > 1 || (doc.firstChild !== null && doc.firstChild.type.name !== 'paragraph')
		if (multiBlock) {
			if (!expandedRef.current) setExpanded(true)
			return
		}
		const field = wrap.parentElement
		const send = field ? field.querySelector<HTMLElement>('.tlui-cmt-send') : null
		const input = wrap.querySelector('.tlui-cmt-input')
		if (!send || !input) return
		mirror.innerHTML = input.innerHTML
		const textWidth = mirror.offsetWidth
		// Measured against the wrap's *content* box: text wraps at clientWidth minus padding, so
		// without subtracting it the input grows a line before expansion fires and then snaps.
		const wrapStyle = getComputedStyle(wrap)
		const wrapPadX = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight)
		const collapsedAvailable =
			wrap.clientWidth - wrapPadX - (expandedRef.current ? send.offsetWidth + 6 : 0)
		if (!expandedRef.current && textWidth > collapsedAvailable - 8) {
			setExpanded(true)
		} else if (expandedRef.current && textWidth < collapsedAvailable - 24) {
			setExpanded(false)
		}
	}
	const remeasureRef = useRef(remeasure)
	remeasureRef.current = remeasure

	// Reachable from `handleKeyDown`, which is created before `useEditor` returns.
	const editorRef = useRef<ReturnType<typeof useEditor>>(null)

	// `commands.enter()` re-dispatches through `handleKeyDown`; without this guard our own handler
	// would catch the synthetic Enter and submit.
	const replayingEnter = useRef(false)

	// The suggestion plugin is built once and runs outside React, so it reads the mention callbacks
	// through refs — otherwise it queries the roster present at mount forever, never seeing a member
	// who joins later. Whether mentions are wired at all is fixed at mount; the callbacks are live.
	const mentionsEnabled = !!getMentionSuggestions
	const hasCustomRow = !!renderMentionSuggestion
	const extensions = useMemo(() => {
		const list = [...commentTipTapExtensions]
		// The mention node is always registered, or ProseMirror strips existing mentions when an
		// edited body loads. Only the `@` trigger is gated on the host providing a resolver.
		if (mentionsEnabled) {
			const resolveSuggestions = (query: string) => getMentionSuggestionsRef.current?.(query) ?? []
			const renderRow = hasCustomRow
				? (member: MentionMember) => renderMentionSuggestionRef.current?.(member)
				: undefined
			list.push(
				createMentionExtension({
					suggestion: createMentionSuggestion(resolveSuggestions, {
						renderMember: renderRow,
						editor: tlEditor,
					}),
				})
			)
		} else {
			list.push(createMentionExtension({ suggestion: { char: '@', allow: () => false } }))
		}
		return list
	}, [mentionsEnabled, hasCustomRow, tlEditor])

	const editor = useEditor(
		{
			extensions,
			content: (value ?? EMPTY_COMMENT) as JSONContent,
			editable: interactive,
			// tldraw ships its own TextDirection extension, so TipTap's core one would warn about a
			// duplicate. Mirrors RichTextArea's setup.
			enableCoreExtensions: { textDirection: false },
			textDirection: 'auto',
			editorProps: {
				attributes: {
					class: 'tlui-cmt-input',
					'aria-label': placeholder,
					role: 'textbox',
					'aria-multiline': 'true',
				},
				// Runs before every keymap plugin, so it can distinguish Shift+Enter from Enter — an
				// `Enter` keymap binding also fires on Shift+Enter and would otherwise swallow it.
				handleKeyDown: (_view, event) => {
					// Let the keymaps handle the synthetic Enter we replay for a Shift+Enter newline.
					if (replayingEnter.current) return false
					// Up in an empty composer hands off to the host. With content it stays cursor
					// movement, and with the picker open it navigates the roster.
					if (event.key === 'ArrowUp' && !event.isComposing) {
						if (
							onArrowUpWhenEmptyRef.current &&
							editorRef.current?.isEmpty &&
							!isMentionPickerOpen()
						) {
							onArrowUpWhenEmptyRef.current()
							return true
						}
						return false
					}
					if (event.key !== 'Enter' || event.isComposing) return false
					// While the @-mention picker is open, Enter selects the highlighted member — defer.
					if (isMentionPickerOpen()) return false
					// Shift+Enter inserts a new line by replaying a plain Enter through the keymaps, reusing
					// the editor's list-aware handling. tldraw doesn't do soft breaks.
					if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
						// An empty field would open the comment with a stray leading blank line.
						if (editorRef.current?.isEmpty) return true
						replayingEnter.current = true
						try {
							editorRef.current?.commands.enter()
						} finally {
							replayingEnter.current = false
						}
						return true
					}
					// Enter, Cmd+Enter, and Ctrl+Enter submit.
					if (!disabledRef.current) onSubmitRef.current?.()
					return true
				},
			},
			onUpdate: ({ editor }) => {
				setIsEmpty(editor.isEmpty)
				// Same-value state sets don't re-render, and the DOM is already updated here.
				remeasureRef.current()
				onChangeRef.current?.(editor.getJSON() as TLRichText)
			},
		},
		[interactive, placeholder]
	)
	editorRef.current = editor

	// Sync controlled resets (e.g. the parent clearing to EMPTY_COMMENT after posting) into the
	// editor without echoing back the value the editor itself just emitted.
	useEffect(() => {
		if (!editor || value === undefined) return
		if (isEqual(editor.getJSON(), value)) return
		editor.commands.setContent(value as JSONContent)
		setIsEmpty(editor.isEmpty)
	}, [editor, value])

	// Measure once the editor's content is in the DOM, so a composer that mounts pre-filled (the
	// edit-in-place composer) starts in the right layout.
	useLayoutEffect(() => {
		remeasureRef.current()
	}, [editor, value])

	// Focus on the next frame rather than via TipTap's autofocus: the composer often mounts from a
	// canvas pointer event whose default focus handling would otherwise steal it back.
	useEffect(() => {
		if (!autoFocus || !editor) return
		const raf = requestAnimationFrame(() => editor.commands.focus('end'))
		return () => cancelAnimationFrame(raf)
	}, [autoFocus, editor])

	// The whole field behaves like the text input: clicking its empty area (the padding, or the
	// space beside/below a short line) focuses the editor rather than only the text glyphs being
	// clickable. The input (caret placement) and the send button keep their own click handling.
	const focusEditorFromField = (e: ReactMouseEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement
		if (target.closest('.tlui-cmt-input') || target.closest('.tlui-cmt-send')) return
		e.preventDefault()
		editor?.commands.focus('end')
	}

	return (
		<div className="tlui-cmt-composer">
			{leading ?? <Avatar author={author} />}
			<div
				className={[
					'tlui-cmt-composer__field',
					interactive && expanded && 'tlui-cmt-composer__field--expanded',
				]
					.filter(Boolean)
					.join(' ')}
				onMouseDown={interactive ? focusEditorFromField : undefined}
			>
				<div className="tlui-cmt-composer__input-wrap" ref={inputWrapRef}>
					<EditorContent editor={editor} />
					{isEmpty && (
						<div className="tlui-cmt-input__placeholder" aria-hidden="true">
							{placeholder}
						</div>
					)}
					<div
						className="tlui-cmt-composer__mirror tlui-cmt-input"
						ref={mirrorRef}
						aria-hidden="true"
					/>
				</div>
				{interactive && <SendButton label={sendLabel} onClick={onSubmit} disabled={disabled} />}
			</div>
		</div>
	)
}

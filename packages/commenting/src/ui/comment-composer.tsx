import { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { isEqual, TLRichText, useMaybeEditor } from 'tldraw'
import { Avatar } from './avatar'
import { CommentAuthor } from './comment-author'
import { commentTipTapExtensions, EMPTY_COMMENT, isCommentEmpty } from './comment-extensions'
import { commentMention } from './comment-mention'
import { MentionMember } from './mention-list'
import { createMentionSuggestion, isMentionPickerOpen } from './mention-suggestion'
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
	disabled,
	autoFocus,
	leading,
	getMentionSuggestions,
	renderMentionSuggestion,
}: CommentComposerProps) {
	const interactive = !!onChange || !!onSubmit
	// The canvas editor the composer lives in, if any — lets the mention popup track the camera. Null
	// when the composer is used outside a tldraw editor (e.g. an isolated demo).
	const tlEditor = useMaybeEditor()

	// Callbacks are read through refs so the editor instance doesn't need to be recreated when they
	// change identity between renders.
	const onChangeRef = useRef(onChange)
	onChangeRef.current = onChange
	const onSubmitRef = useRef(onSubmit)
	onSubmitRef.current = onSubmit
	const disabledRef = useRef(disabled)
	disabledRef.current = disabled
	const getMentionSuggestionsRef = useRef(getMentionSuggestions)
	getMentionSuggestionsRef.current = getMentionSuggestions
	const renderMentionSuggestionRef = useRef(renderMentionSuggestion)
	renderMentionSuggestionRef.current = renderMentionSuggestion

	const [isEmpty, setIsEmpty] = useState(() => !value || isCommentEmpty(value))

	// The editor instance, reachable from `handleKeyDown` (which is created before `useEditor`
	// returns). Updated on every render so the ref never points at a stale editor.
	const editorRef = useRef<ReturnType<typeof useEditor>>(null)

	// Set while we replay Enter through the keymaps for a Shift+Enter newline: `commands.enter()`
	// re-dispatches Enter through `handleKeyDown`, and without this guard our own handler would catch
	// that synthetic Enter and submit instead.
	const replayingEnter = useRef(false)

	// Enter and Cmd/Ctrl+Enter submit the comment; Shift+Enter inserts a new line for the occasional
	// multi-line comment. This is handled through `editorProps.handleKeyDown` (below) rather than a
	// keyboard-shortcut extension: ProseMirror runs `handleKeyDown` before every keymap plugin, so it
	// can tell Shift+Enter apart from Enter — an `Enter` keymap binding also fires on Shift/Cmd+Enter
	// and would otherwise swallow the newline.

	// The suggestion plugin is built once (the editor is recreated only on `interactive`) and runs
	// outside React, so it must read the mention callbacks through refs — like onChange/onSubmit —
	// or it queries the roster present at mount forever, never seeing a member who loads or joins
	// later. Whether mentions (and a custom picker row) are wired at all is fixed at mount; only the
	// callbacks themselves are live.
	const mentionsEnabled = !!getMentionSuggestions
	const hasCustomRow = !!renderMentionSuggestion
	const extensions = useMemo(() => {
		const list = [...commentTipTapExtensions]
		// Always register the mention node so an existing body that contains a mention keeps it on
		// edit (an unregistered node would be stripped by ProseMirror when the content loads). The `@`
		// picker itself only turns on when the host provides a resolver; otherwise the node is present
		// but its trigger is disabled.
		if (mentionsEnabled) {
			const resolveSuggestions = (query: string) => getMentionSuggestionsRef.current?.(query) ?? []
			const renderRow = hasCustomRow
				? (member: MentionMember) => renderMentionSuggestionRef.current?.(member)
				: undefined
			list.push(
				commentMention({
					suggestion: createMentionSuggestion(resolveSuggestions, {
						renderMember: renderRow,
						editor: tlEditor,
					}),
				})
			)
		} else {
			list.push(commentMention({ suggestion: { char: '@', allow: () => false } }))
		}
		return list
	}, [mentionsEnabled, hasCustomRow, tlEditor])

	const editor = useEditor(
		{
			extensions,
			content: (value ?? EMPTY_COMMENT) as JSONContent,
			editable: interactive,
			// tldraw's default extensions add their own TextDirection extension (so it can be
			// overridden), so disable TipTap's core one to avoid a duplicate-extension warning —
			// mirrors RichTextArea's setup.
			enableCoreExtensions: { textDirection: false },
			textDirection: 'auto',
			editorProps: {
				attributes: { class: 'tlui-cmt-input' },
				// Runs before every keymap plugin, so it can distinguish Shift+Enter from Enter — an
				// `Enter` keymap binding also fires on Shift+Enter and would otherwise swallow it.
				handleKeyDown: (_view, event) => {
					// Let the keymaps handle the synthetic Enter we replay for a Shift+Enter newline.
					if (replayingEnter.current) return false
					if (event.key !== 'Enter' || event.isComposing) return false
					// While the @-mention picker is open, Enter selects the highlighted member — defer.
					if (isMentionPickerOpen()) return false
					// Shift+Enter inserts a new line. Replay a plain Enter through the keymaps (guarded so
					// we don't re-enter and submit) to reuse the editor's list-aware Enter handling — a new
					// list item in a list, a new paragraph otherwise. tldraw doesn't do soft breaks.
					if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
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
				onChangeRef.current?.(editor.getJSON() as TLRichText)
			},
		},
		[interactive]
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

	// Focus on the next frame rather than via TipTap's autofocus: the composer often mounts from a
	// canvas pointer event whose default focus handling would otherwise steal it back.
	useEffect(() => {
		if (!autoFocus || !editor) return
		const raf = requestAnimationFrame(() => editor.commands.focus('end'))
		return () => cancelAnimationFrame(raf)
	}, [autoFocus, editor])

	return (
		<div className="tlui-cmt-composer">
			{leading ?? <Avatar author={author} />}
			<div className="tlui-cmt-composer__field">
				<div className="tlui-cmt-composer__input-wrap">
					<EditorContent editor={editor} />
					{isEmpty && (
						<div className="tlui-cmt-input__placeholder" aria-hidden="true">
							{placeholder}
						</div>
					)}
				</div>
				{interactive && <SendButton label={sendLabel} onClick={onSubmit} disabled={disabled} />}
			</div>
		</div>
	)
}

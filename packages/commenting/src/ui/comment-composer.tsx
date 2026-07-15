import { Extension, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { isEqual, TLRichText } from 'tldraw'
import { Avatar } from './avatar'
import { commentTipTapExtensions, EMPTY_COMMENT, isCommentEmpty } from './comment-extensions'
import { commentMention } from './comment-mention'
import './comments.css'
import { MentionMember } from './mention-list'
import { createMentionSuggestion, isMentionPickerOpen } from './mention-suggestion'
import { SendButton } from './send-button'

export interface CommentComposerProps {
	author: string
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

	// Enter submits the comment. Shift+Enter (and Cmd/Ctrl+Enter) keep their default behavior — a
	// new line — for the occasional multi-line comment.
	const submitExtension = useMemo(
		() =>
			Extension.create({
				name: 'commentComposerSubmit',
				priority: 1000,
				addKeyboardShortcuts() {
					return {
						Enter: () => {
							// While the @-mention picker is open, Enter selects the highlighted member.
							// This extension outranks the mention plugin (priority 1000), so defer to the
							// picker here or Enter would submit before the member could be inserted.
							if (isMentionPickerOpen()) return false
							if (!disabledRef.current) onSubmitRef.current?.()
							return true
						},
					}
				},
			}),
		[]
	)

	// The suggestion plugin is built once (the editor is recreated only on `interactive`) and runs
	// outside React, so it must read the mention callbacks through refs — like onChange/onSubmit —
	// or it queries the roster present at mount forever, never seeing a member who loads or joins
	// later. Whether mentions (and a custom picker row) are wired at all is fixed at mount; only the
	// callbacks themselves are live.
	const mentionsEnabled = !!getMentionSuggestions
	const hasCustomRow = !!renderMentionSuggestion
	const extensions = useMemo(() => {
		const list = [...commentTipTapExtensions, submitExtension]
		if (mentionsEnabled) {
			const resolveSuggestions = (query: string) => getMentionSuggestionsRef.current?.(query) ?? []
			const renderRow = hasCustomRow
				? (member: MentionMember) => renderMentionSuggestionRef.current?.(member)
				: undefined
			list.push(
				commentMention({
					suggestion: createMentionSuggestion(resolveSuggestions, { renderMember: renderRow }),
				})
			)
		}
		return list
	}, [submitExtension, mentionsEnabled, hasCustomRow])

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
			editorProps: { attributes: { class: 'cmt-input' } },
			onUpdate: ({ editor }) => {
				setIsEmpty(editor.isEmpty)
				onChangeRef.current?.(editor.getJSON() as TLRichText)
			},
		},
		[interactive]
	)

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
		<div className="cmt-composer">
			{leading ?? <Avatar name={author} />}
			<div className="cmt-composer__field">
				<div className="cmt-composer__input-wrap">
					<EditorContent editor={editor} />
					{isEmpty && (
						<div className="cmt-input__placeholder" aria-hidden="true">
							{placeholder}
						</div>
					)}
				</div>
				{interactive && <SendButton label={sendLabel} onClick={onSubmit} disabled={disabled} />}
			</div>
		</div>
	)
}

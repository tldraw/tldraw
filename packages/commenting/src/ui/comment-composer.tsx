import { Extension, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { isEqual, TLRichText } from 'tldraw'
import { Avatar } from './avatar'
import { commentTipTapExtensions, EMPTY_COMMENT, isCommentEmpty } from './comment-extensions'
import './comments.css'
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
							if (!disabledRef.current) onSubmitRef.current?.()
							return true
						},
					}
				},
			}),
		[]
	)

	const extensions = useMemo(() => [...commentTipTapExtensions, submitExtension], [submitExtension])

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

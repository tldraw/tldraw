import { Editor, EditorEvents } from '@tiptap/core'
import { TLCamera, TLShape, track, useEditor, useValue, Vec } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

/** @public @react */
export const RichTextToolbar = track(function RichTextToolbar() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'rich-text-menu'
	const [currentShape, setCurrentShape] = useState<TLShape | null>()
	const [currentCoordinates, setCurrentCoordinates] = useState<Vec>()
	const [currentCamera, setCurrentCamera] = useState<TLCamera>(editor.getCamera())
	const [isEditingLink, setIsEditingLink] = useState(false)

	const showToolbar = editor.isInAny('select.editing_shape')
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	const camera = editor.getCamera()
	const selectedShape = editor.getOnlySelectedShape()
	const pageCoordinates = selectionRotatedPageBounds
		? editor.pageToViewport(selectionRotatedPageBounds.point)
		: null
	const textEditor: Editor = useValue('textEditor', () => editor.getEditingShapeTextEditor(), [
		editor,
	])
	const [, setTextEditorState] = useState(textEditor?.state)

	useEffect(() => {
		if (
			pageCoordinates &&
			((selectedShape && !currentShape) ||
				selectedShape?.id !== currentShape?.id ||
				currentCamera.x !== camera.x ||
				currentCamera.y !== camera.y ||
				currentCamera.z !== camera.z)
		) {
			if (!currentCoordinates || !currentCoordinates.equals(pageCoordinates)) {
				setCurrentCoordinates(pageCoordinates)
			}
		}
		if (!showToolbar) {
			setCurrentShape(null)
		} else {
			setCurrentShape(selectedShape)
		}
		setCurrentCamera(camera)
	}, [
		selectedShape,
		currentShape,
		currentCoordinates,
		pageCoordinates,
		showToolbar,
		camera,
		currentCamera,
	])

	useEffect(() => {
		if (!textEditor) return
		const handleTransaction = ({ editor: textEditor }: EditorEvents['transaction']) => {
			setTextEditorState(textEditor.state)
		}
		const handleClick = () => {
			setIsEditingLink(textEditor.isActive('link'))
		}

		textEditor.on('transaction', handleTransaction)
		textEditor.view.dom.addEventListener('click', handleClick)

		return () => {
			textEditor.off('transaction', handleTransaction)
			textEditor.view.dom.removeEventListener('click', handleClick)
		}
	}, [textEditor])

	if (!showToolbar) return null
	if (!selectionRotatedPageBounds) return null
	if (!currentCoordinates) return null
	if (!textEditor) return null

	const handleLinkComplete = (link: string) => {
		trackEvent('rich-text', { operation: 'link-edit', source })
		if (!link.startsWith('http://') && !link.startsWith('https://')) {
			link = `https://${link}`
		}

		textEditor.chain().setLink({ href: link }).focus().run()
		setIsEditingLink(false)
	}

	const handleRemoveLink = () => {
		trackEvent('rich-text', { operation: 'link-remove', source })
		textEditor.chain().unsetLink().focus().run()
		setIsEditingLink(false)
	}

	const handleLinkCancel = () => {
		setIsEditingLink(false)
	}

	return (
		<div
			className="tl-rich-text__toolbar"
			style={{
				top: Math.floor(Math.max(16, currentCoordinates.y - 64)),
				left: Math.floor(Math.max(16, currentCoordinates.x)),
				width: Math.floor(selectionRotatedPageBounds.width * editor.getZoomLevel()),
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div className="tlui-toolbar__tools" role="radiogroup">
				{isEditingLink ? (
					<LinkEditor
						value={textEditor.isActive('link') ? textEditor.getAttributes('link').href : ''}
						onComplete={handleLinkComplete}
						onCancel={handleLinkCancel}
						onRemoveLink={handleRemoveLink}
					/>
				) : (
					<>
						<TldrawUiButton
							title={msg('tool.rich-text-bold')}
							type="icon"
							isActive={textEditor.isActive('bold')}
							onClick={() => {
								trackEvent('rich-text', { operation: 'bold', source })
								textEditor.chain().focus().toggleBold().run()
							}}
						>
							<TldrawUiButtonIcon small icon="bold" />
						</TldrawUiButton>
						<TldrawUiButton
							title={msg('tool.rich-text-strikethrough')}
							type="icon"
							isActive={textEditor.isActive('strike')}
							onClick={() => {
								trackEvent('rich-text', { operation: 'strikethrough', source })
								textEditor.chain().focus().toggleStrike().run()
							}}
						>
							<TldrawUiButtonIcon small icon="strikethrough" />
						</TldrawUiButton>
						<TldrawUiButton
							title={msg('tool.rich-text-link')}
							type="icon"
							isActive={textEditor.isActive('link')}
							onClick={() => {
								trackEvent('rich-text', { operation: 'link', source })
								setIsEditingLink(true)
							}}
						>
							<TldrawUiButtonIcon small icon="link" />
						</TldrawUiButton>
						<TldrawUiButton
							title={msg('tool.rich-text-header')}
							type="icon"
							isActive={textEditor.isActive('heading', { level: 3 })}
							onClick={() => {
								trackEvent('rich-text', { operation: 'header', source })
								textEditor.chain().focus().toggleHeading({ level: 3 }).run()
							}}
						>
							<TldrawUiButtonIcon small icon="header" />
						</TldrawUiButton>
						<TldrawUiButton
							title={msg('tool.rich-text-bulleted-list')}
							type="icon"
							isActive={textEditor.isActive('bulletList')}
							onClick={() => {
								trackEvent('rich-text', { operation: 'bulleted-list', source })
								textEditor.chain().focus().toggleBulletList().run()
							}}
						>
							<TldrawUiButtonIcon small icon="bulleted-list" />
						</TldrawUiButton>
					</>
				)}
			</div>
		</div>
	)
})

function LinkEditor({
	value: initialValue,
	onComplete,
	onCancel,
	onRemoveLink,
}: {
	value: string
	onComplete(link: string): void
	onCancel(): void
	onRemoveLink(): void
}) {
	const [value, setValue] = useState(initialValue)
	const msg = useTranslation()
	const ref = useRef<HTMLInputElement>(null)

	const handleValueChange = (value: string) => setValue(value)

	useEffect(() => {
		ref.current?.focus()
	}, [])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				className="tl-rich-text__toolbar-link-input"
				value={value}
				onValueChange={handleValueChange}
				onComplete={onComplete}
				onCancel={onCancel}
			/>
			<TldrawUiButton
				className="tl-rich-text__toolbar-link-remove"
				title={msg('tool.rich-text-link-remove')}
				type="icon"
				onClick={onRemoveLink}
			>
				<TldrawUiButtonIcon small icon="cross-2" />
			</TldrawUiButton>
		</>
	)
}

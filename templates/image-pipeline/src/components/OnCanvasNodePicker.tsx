import { Dialog, VisuallyHidden } from 'radix-ui'
import { useCallback, useMemo, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TLShapeId,
	useEditor,
	usePassThroughWheelEvents,
	useQuickReactor,
	useValue,
	Vec,
	VecModel,
} from 'tldraw'
import { getConnectionTerminals } from '../connection/ConnectionShapeUtil'
import { NODE_WIDTH_PX } from '../constants'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'
import { NodeDefinition } from '../nodes/types/shared'
import { EditorAtom } from '../utils'

export interface OnCanvasNodePickerState {
	connectionShapeId: TLShapeId
	location: 'start' | 'end' | 'middle'
	onPick: (nodeType: NodeType, position: VecModel) => void
	onClose: () => void
}

export const onCanvasNodePickerState = new EditorAtom<OnCanvasNodePickerState | null>(
	'on canvas node picker',
	() => null
)

export function OnCanvasNodePicker() {
	const editor = useEditor()
	const onClose = useCallback(() => {
		const state = onCanvasNodePickerState.get(editor)
		if (!state) return
		onCanvasNodePickerState.set(editor, null)
		state.onClose()
	}, [editor])
	const nodeDefs = getNodeDefinitions(editor)

	return (
		<OnCanvasNodePickerDialog onClose={onClose}>
			<TldrawUiMenuGroup id="inputs">
				<OnCanvasNodePickerItem definition={nodeDefs.model} onClose={onClose} />
				<OnCanvasNodePickerItem definition={nodeDefs.prompt} onClose={onClose} />
				<OnCanvasNodePickerItem definition={nodeDefs.load_image} onClose={onClose} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="process">
				<OnCanvasNodePickerItem definition={nodeDefs.generate} onClose={onClose} />
				<OnCanvasNodePickerItem definition={nodeDefs.controlnet} onClose={onClose} />
				<OnCanvasNodePickerItem definition={nodeDefs.blend} onClose={onClose} />
				<OnCanvasNodePickerItem definition={nodeDefs.adjust} onClose={onClose} />
				<OnCanvasNodePickerItem definition={nodeDefs.prompt_concat} onClose={onClose} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="output">
				<OnCanvasNodePickerItem definition={nodeDefs.preview} onClose={onClose} />
			</TldrawUiMenuGroup>
		</OnCanvasNodePickerDialog>
	)
}

function OnCanvasNodePickerDialog({
	children,
	onClose,
}: {
	children: React.ReactNode
	onClose: () => void
}) {
	const editor = useEditor()
	const location = useValue('location', () => onCanvasNodePickerState.get(editor)?.location, [
		editor,
	])
	const shouldRender = !!location
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	usePassThroughWheelEvents(useMemo(() => ({ current: container }), [container]))

	useQuickReactor(
		'OnCanvasNodePicker',
		() => {
			const state = onCanvasNodePickerState.get(editor)
			if (!state) return

			if (!container) return

			const connection = editor.getShape(state.connectionShapeId)
			if (!connection || !editor.isShapeOfType(connection, 'connection')) {
				onClose()
				return
			}

			const terminals = getConnectionTerminals(editor, connection)
			const terminalInConnectionSpace =
				state.location === 'middle'
					? Vec.Lrp(terminals.start, terminals.end, 0.5)
					: terminals[state.location]

			const terminalInPageSpace = editor
				.getShapePageTransform(connection)
				.applyToPoint(terminalInConnectionSpace)

			const terminalInViewportSpace = editor.pageToViewport(terminalInPageSpace)
			container.style.transform = `translate(${terminalInViewportSpace.x}px, ${terminalInViewportSpace.y}px) scale(${editor.getZoomLevel()}) `
		},
		[editor, container]
	)

	return (
		<Dialog.Root
			open={shouldRender}
			modal={false}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
		>
			<Dialog.Content
				ref={setContainer}
				className={`OnCanvasNodePicker OnCanvasNodePicker_${location}`}
				style={{ width: NODE_WIDTH_PX }}
			>
				<div className="OnCanvasNodePicker-content">
					<VisuallyHidden.Root>
						<Dialog.Title>Insert node</Dialog.Title>
					</VisuallyHidden.Root>
					<TldrawUiMenuContextProvider sourceId="dialog" type="menu">
						{children}
					</TldrawUiMenuContextProvider>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	)
}

function OnCanvasNodePickerItem<T extends NodeType>({
	definition,
	onClose,
}: {
	definition: NodeDefinition<T>
	onClose: () => void
}) {
	const editor = useEditor()

	return (
		<TldrawUiButton
			key={definition.type}
			type="menu"
			className="OnCanvasNodePicker-button"
			onPointerDown={editor.markEventAsHandled}
			onClick={() => {
				const state = onCanvasNodePickerState.get(editor)
				if (!state) return

				const connection = editor.getShape(state.connectionShapeId)
				if (!connection || !editor.isShapeOfType(connection, 'connection')) {
					onClose()
					return
				}

				const terminals = getConnectionTerminals(editor, connection)
				const terminalInConnectionSpace =
					state.location === 'middle'
						? Vec.Lrp(terminals.start, terminals.end, 0.5)
						: terminals[state.location]

				const terminalInPageSpace = editor
					.getShapePageTransform(connection)
					.applyToPoint(terminalInConnectionSpace)

				state.onPick(definition.getDefault(), terminalInPageSpace)

				onClose()
			}}
		>
			<TldrawUiButtonIcon icon={definition.icon} />
			<TldrawUiButtonLabel>{definition.title}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

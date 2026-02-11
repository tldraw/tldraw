import { useCallback, useState } from 'react'
import { T, useEditor } from 'tldraw'
import { LoadImageIcon } from '../../components/icons/LoadImageIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_IMAGE_PREVIEW_HEIGHT_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	NodeComponentProps,
	NodeDefinition,
	NodeImage,
	NodeRow,
	updateNode,
} from './shared'

export type LoadImageNode = T.TypeOf<typeof LoadImageNode>
export const LoadImageNode = T.object({
	type: T.literal('load_image'),
	imageUrl: T.string.nullable(),
})

export class LoadImageNodeDefinition extends NodeDefinition<LoadImageNode> {
	static type = 'load_image'
	static validator = LoadImageNode
	title = 'Load image'
	heading = 'Image'
	icon = (<LoadImageIcon />)
	category = 'input'
	getDefault(): LoadImageNode {
		return {
			type: 'load_image',
			imageUrl: null,
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'image',
			},
		}
	}
	async execute(_shape: NodeShape, node: LoadImageNode): Promise<ExecutionResult> {
		await sleep(300)
		return { output: node.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: LoadImageNode): InfoValues {
		return {
			output: {
				value: node.imageUrl,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = LoadImageNodeComponent
}

/** Read a File as a data URL. */
function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

/** Open the native file picker for an image file. */
function selectImageFile(): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.style.display = 'none'

		const dispose = () => {
			input.removeEventListener('change', onChange)
			input.removeEventListener('cancel', onCancel)
			input.remove()
		}

		const onChange = (event: Event) => {
			const fileList = (event.target as HTMLInputElement).files
			resolve(fileList && fileList.length > 0 ? fileList[0] : null)
			dispose()
		}

		const onCancel = () => {
			resolve(null)
			dispose()
		}

		document.body.appendChild(input)
		input.addEventListener('cancel', onCancel)
		input.addEventListener('change', onChange)
		input.click()
	})
}

function LoadImageNodeComponent({ shape, node }: NodeComponentProps<LoadImageNode>) {
	const editor = useEditor()
	const [isDragOver, setIsDragOver] = useState(false)

	const handleFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith('image/')) return
			const dataUrl = await readFileAsDataUrl(file)
			updateNode<LoadImageNode>(editor, shape, (n) => ({ ...n, imageUrl: dataUrl }))
		},
		[editor, shape]
	)

	const handleBrowse = useCallback(async () => {
		const file = await selectImageFile()
		if (file) handleFile(file)
	}, [handleFile])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragOver(false)
			const file = e.dataTransfer.files[0]
			if (file) handleFile(file)
		},
		[handleFile]
	)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(false)
	}, [])

	return (
		<>
			<NodeRow>
				<button
					className="LoadImageNode-browse"
					onClick={handleBrowse}
					onPointerDown={(e) => e.stopPropagation()}
				>
					{node.imageUrl ? 'Replace...' : 'Browse...'}
				</button>
				{node.imageUrl && (
					<button
						className="LoadImageNode-clear"
						onClick={() =>
							updateNode<LoadImageNode>(editor, shape, (n) => ({ ...n, imageUrl: null }))
						}
						onPointerDown={(e) => e.stopPropagation()}
						title="Clear image"
					>
						×
					</button>
				)}
			</NodeRow>
			<div
				className={`NodeImagePreview ${isDragOver ? 'NodeImagePreview_dragover' : ''}`}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
			>
				{node.imageUrl ? (
					<NodeImage src={node.imageUrl} alt="Loaded" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>{isDragOver ? 'Drop image here' : 'Drop or browse for an image'}</span>
					</div>
				)}
			</div>
		</>
	)
}

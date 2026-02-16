/**
 * ShapeUtil for the code block shape with syntax highlighting
 */

import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, Vec } from 'tldraw'
import { codeToHtml } from 'shiki'
import { useEffect, useState } from 'react'
import { CodeBlockShape, CODE_BLOCK_SHAPE_TYPE } from './CodeBlockShape'
import { convertCodeToShapes } from '../utils/convertCodeToShapes'

export class CodeBlockShapeUtil extends BaseBoxShapeUtil<CodeBlockShape> {
	static override type = CODE_BLOCK_SHAPE_TYPE
	static override props: RecordProps<CodeBlockShape> = {
		code: T.string,
		language: T.string,
		w: T.number,
		h: T.number,
	}

	override canEdit() {
		return true
	}

	getDefaultProps(): CodeBlockShape['props'] {
		return {
			code: 'flowchart LR\n  A --> B',
			language: 'mermaid',
			w: 400,
			h: 300,
		}
	}

	component(shape: CodeBlockShape) {
		const isEditing = this.editor.getEditingShapeId() === shape.id
		const [highlightedCode, setHighlightedCode] = useState<string>('')

		// Check if this code block is linked to diagram shapes
		const isLinked = shape.meta.linkedShapeIds && (shape.meta.linkedShapeIds as string[]).length > 0
		const linkedShapesExist =
			isLinked &&
			(shape.meta.linkedShapeIds as string[]).some((id) => this.editor.getShape(id) !== undefined)

		useEffect(() => {
			// Syntax highlight the code using Shiki
			codeToHtml(shape.props.code, {
				lang: shape.props.language,
				theme: 'github-dark',
			}).then((html) => {
				setHighlightedCode(html)
			})
		}, [shape.props.code, shape.props.language])

		const handleConvert = async () => {
			// Convert code to shapes, positioned to the right of the code block
			const position = new Vec(shape.x + shape.props.w + 100, shape.y)
			await convertCodeToShapes(this.editor, shape.props.code, position, shape.id)
		}

		return (
			<HTMLContainer
				id={shape.id}
				onPointerDown={isEditing ? this.editor.markEventAsHandled : undefined}
				style={{
					pointerEvents: isEditing ? 'all' : 'none',
					width: shape.props.w,
					height: shape.props.h,
					overflow: 'auto',
					backgroundColor: '#0d1117',
					borderRadius: '6px',
					position: 'relative',
					border: linkedShapesExist ? '2px solid #2ea043' : '2px solid #30363d',
					boxShadow: linkedShapesExist ? '0 0 8px rgba(46, 160, 67, 0.4)' : 'none',
				}}
			>
				{isEditing ? (
					<textarea
						value={shape.props.code}
						onChange={(e) => {
							this.editor.updateShape({
								id: shape.id,
								type: shape.type,
								props: {
									code: e.target.value,
								},
							})
						}}
						style={{
							width: '100%',
							height: '100%',
							backgroundColor: '#0d1117',
							color: '#c9d1d9',
							border: 'none',
							padding: '16px',
							fontFamily: 'monospace',
							fontSize: '14px',
							resize: 'none',
							outline: 'none',
						}}
					/>
				) : (
					<>
						<div
							dangerouslySetInnerHTML={{ __html: highlightedCode }}
							style={{
								padding: '16px',
								fontSize: '14px',
								lineHeight: '1.5',
							}}
						/>
						<button
							onClick={handleConvert}
							onPointerDown={(e) => {
								e.stopPropagation()
								this.editor.markEventAsHandled(e)
							}}
							style={{
								position: 'absolute',
								top: '8px',
								right: '8px',
								padding: '6px 12px',
								backgroundColor: '#238636',
								color: 'white',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								fontSize: '12px',
								fontWeight: '500',
								pointerEvents: 'all',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = '#2ea043'
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = '#238636'
							}}
						>
							{linkedShapesExist ? '↻ Update Diagram' : '▶ Convert to Diagram'}
						</button>
					</>
				)}
			</HTMLContainer>
		)
	}

	indicator(shape: CodeBlockShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

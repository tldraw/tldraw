import {
	Editor,
	FileHelpers,
	renderPlaintextFromRichText,
	TLGeoShapeProps,
	TLShapeId,
	TLTextShapeProps,
} from 'tldraw'
import { IPromptInfo, IShapeStub } from './xml-types'

export class PromptHelper {
	constructor(
		private readonly editor: Editor,
		private readonly prompt: string
	) {}

	/**
	 * Get the prompt info for the current editor state.
	 */
	async getPromptInfo(): Promise<IPromptInfo> {
		const { editor } = this

		const vpb = editor.getViewportPageBounds()
		const shapesIdsInViewport = editor.getCurrentPageShapeIdsSorted().filter((id) => {
			const shape = editor.getShape(id)
			if (!shape) return false
			const bounds = editor.getShapePageBounds(id)
			if (!bounds) return false
			return vpb.includes(bounds)
		})

		const imageResult = await editor.toImage(shapesIdsInViewport, {
			background: true,
			darkMode: false,
			quality: 0.8,
		})
		const imageSrc = await FileHelpers.blobToDataUrl(imageResult.blob)

		return {
			image: imageSrc,
			viewport: { id: 'viewport', minX: vpb.minX, minY: vpb.minY, maxX: vpb.maxX, maxY: vpb.maxY },
			contents: this.getCanvasContents(),
			prompt: this.prompt,
		}
	}

	/**
	 * Based on the editor's current state, return a simple description of the canvas's contents as bounding boxes with the shape's id and type.
	 */
	getCanvasContents() {
		const { editor } = this
		const allShapes = editor.getCurrentPageShapesSorted()

		const stubs: IShapeStub[] = []
		for (let i = 0; i < allShapes.length; i++) {
			const shape = allShapes[i]
			const boundingBox = editor.getShapePageBounds(shape.id)
			if (!boundingBox) {
				continue
			}
			stubs.push({
				id: shape.id,
				type: shape.type,
				index: i,
				minX: boundingBox.minX,
				minY: boundingBox.minY,
				maxX: boundingBox.maxX,
				maxY: boundingBox.maxY,
			})
		}
		// sort by top left to bottom right
		stubs.sort((a, b) => {
			return a.minX * a.minX + a.minY * a.minY - (b.minX * b.minX + b.minY * b.minY)
		})
		return stubs
	}

	/**
	 * Get the canvas's XML representation.
	 */
	getPromptXml(info: IPromptInfo) {
		const { contents } = info

		const xml = `
<prompt>
  <viewport>${info.viewport.id}</viewport>
  <canvas>
    ${contents.map(this.getShapeStubXml).join('\n')}
  </canvas>
</prompt>`

		return xml
	}

	getShapeStubXml(shape: IShapeStub): string | null {
		return `<shape-stub id="${shape.id}" type="${shape.type}" index="${shape.index}" minX="${shape.minX}" minY="${shape.minY}" maxX="${shape.maxX}" maxY="${shape.maxY}" />`
	}

	getShapeFullXml(id: TLShapeId): string | null {
		const { editor } = this
		const shape = editor.getShape(id)
		if (!shape) return null
		switch (shape.type) {
			case 'geo': {
				const props = shape.props as TLGeoShapeProps
				return `<geo id="${id}" x="${shape.x}" y="${shape.y}" width="${props.w}" height="${props.h}" color="${props.color}" text="" fill="${props.fill || 'none'}"/>`
			}
			case 'text': {
				const props = shape.props as TLTextShapeProps
				return `<text id="${id}" x="${shape.x}" y="${shape.y}" text="${renderPlaintextFromRichText(editor, props.richText)}" color="${props.color}"/>`
			}
			default: {
				return null
			}
		}
	}
}

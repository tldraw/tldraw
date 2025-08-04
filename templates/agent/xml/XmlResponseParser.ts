import {
	IFrameShape,
	IGeoShape,
	IHighlightShape,
	ILineShape,
	INoteShape,
	IResponse,
	IShape,
	ITextShape,
	IXmlAlignShapesActionAttributes,
	IXmlArrowDownShapeAttributes,
	IXmlArrowLeftShapeAttributes,
	IXmlArrowRightShapeAttributes,
	IXmlArrowUpShapeAttributes,
	IXMLAttributes,
	IXmlCheckBoxShapeAttributes,
	IXmlCloudShapeAttributes,
	IXmlDeleteShapesActionAttributes,
	IXmlDiamondShapeAttributes,
	IXmlDistributeShapesActionAttributes,
	IXmlEllipseShapeAttributes,
	IXmlFrameShapeAttributes,
	IXmlHeartShapeAttributes,
	IXmlHexagonShapeAttributes,
	IXmlHighlightShapeAttributes,
	IXmlLabelShapeActionAttributes,
	IXmlLineShapeAttributes,
	IXmlMoveShapeActionAttributes,
	IXmlNoteShapeAttributes,
	IXmlOctagonShapeAttributes,
	IXmlOvalShapeAttributes,
	IXmlPentagonShapeAttributes,
	IXmlPlaceShapeActionAttributes,
	// Individual geo type interfaces
	IXmlRectangleShapeAttributes,
	IXmlRhombus2ShapeAttributes,
	IXmlRhombusShapeAttributes,
	IXmlStackShapesActionAttributes,
	IXmlStarShapeAttributes,
	IXmlStatementActionAttributes,
	IXmlTextShapeAttributes,
	IXmlThoughtActionAttributes,
	IXmlTrapezoidShapeAttributes,
	IXmlTriangleShapeAttributes,
	IXmlXBoxShapeAttributes,
} from './xml-types'

export class XmlResponseParser {
	private readonly parser = new DOMParser()

	private _message: string = ''
	private _completedItems: IResponse = []

	parseMessageAndReturnNewItems(message = this._message) {
		// Extract only completed thoughts and actions from the current accumulated message
		const items = this.parseResponseFromMessage(message)

		const newItems = items.slice(this._completedItems.length)
		this._completedItems.push(...newItems)
		return newItems
	}

	parseNewChunk(chunk: string): IResponse {
		this._message += chunk
		return this.parseMessageAndReturnNewItems()
	}

	parseCompletedStream(message: string): IResponse {
		this.parseMessageAndReturnNewItems(message)
		return this.getCompletedItems()
	}

	getCompletedItems(): IResponse {
		return this._completedItems
	}

	reset(): void {
		this._message = ''
		this._completedItems = []
	}

	private parseResponseFromMessage(message = this._message): IResponse {
		const completedItems: IResponse = []

		let prevChar = ''
		let currentTagName = ''
		let currentTag = ''

		let state = 'searching' as 'searching' | 'in-tag-name' | 'in-tag-attributes'

		// flatten the xml tree by removing enclosing tags (response, create-shapes, thoughts, actions)

		// remove the following strings: <response>, <create-shapes>, <thoughts>, <actions>, </response>, </create-shapes>, </thoughts>, </actions>
		let flatMessage = message.replace(
			/<(response|create-shapes|thoughts|actions|\/response|\/create-shapes|\/thoughts|\/actions)>/gs,
			''
		)

		// replace <thought>something</thought> with <thought text="something" />
		flatMessage = flatMessage.replace(
			/<thought>(.*?)<\/thought>/gs,
			(_, p1) => `<thought text="${p1}" />`
		)

		// replace <statement>something</statement> with <statement text="something" />
		flatMessage = flatMessage.replace(
			/<statement>(.*?)<\/statement>/gs,
			(_, p1) => `<statement text="${p1}" />`
		)

		// All remaining tags are self-closing tags in order
		for (const char of flatMessage) {
			switch (state) {
				case 'searching': {
					if (char === '<') {
						currentTag += char
						// start of a tag
						state = 'in-tag-name'
					}

					break
				}
				case 'in-tag-name': {
					currentTag += char
					if (char === ' ') {
						state = 'in-tag-attributes'
					} else if (char === '>' && prevChar === '/') {
						throw new Error('Unexpected closing tag')
					} else {
						currentTagName += char
					}

					break
				}
				case 'in-tag-attributes': {
					currentTag += char
					if (char === '>' && prevChar === '/') {
						state = 'searching'

						switch (currentTagName) {
							// thoughts
							case 'thought': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlThoughtActionAttributes>(currentTag)

								if (!attributes.text) {
									// console.warn(
									// 	`Thought missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({ type: 'thought', text: attributes.text || '' })
								break
							}
							// statements
							case 'statement': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlStatementActionAttributes>(currentTag)

								if (!attributes.text) {
									// console.warn(
									// 	`Statement missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({ type: 'statement', text: attributes.text || '' })
								break
							}
							// delete-shapes
							case 'delete-shapes': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlDeleteShapesActionAttributes>(currentTag)

								if (!attributes['shape-ids']) {
									// console.warn(
									// 	`Delete shapes missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'delete-shapes' as const,
									shapeIds: attributes['shape-ids'].split(','),
								})
								break
							}
							// move-shape
							case 'move-shape': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlMoveShapeActionAttributes>(currentTag)

								if (!attributes['shape-id'] || !attributes['x'] || !attributes['y']) {
									// console.warn(
									// 	`Move shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'move-shape' as const,
									shapeId: attributes['shape-id'],
									x: +attributes.x,
									y: +attributes.y,
								})
								break
							}
							// label-shape
							case 'label-shape': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlLabelShapeActionAttributes>(currentTag)

								if (!attributes['shape-id'] || !attributes['text']) {
									// console.warn(
									// 	`Label shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'label-shape' as const,
									shapeId: attributes['shape-id'],
									text: attributes['text'],
								})
								break
							}
							// align-shapes
							case 'align-shapes': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlAlignShapesActionAttributes>(currentTag)

								const shapeIds = attributes['shape-ids'].split(',')

								if (!attributes['shape-ids'] || !attributes['alignment'] || shapeIds.length < 2) {
									// console.warn(
									// 	`Align shapes missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'align-shapes' as const,
									shapeIds,
									alignment: attributes['alignment'],
								})
								break
							}
							// distribute-shapes
							case 'distribute-shapes': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlDistributeShapesActionAttributes>(currentTag)

								const shapeIds = attributes['shape-ids'].split(',')

								if (!attributes['shape-ids'] || !attributes['direction'] || shapeIds.length < 2) {
									// console.warn(
									// 	`Distribute shapes missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'distribute-shapes' as const,
									shapeIds,
									direction: attributes['direction'],
								})
								break
							}
							// place-shape
							case 'place-shape': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlPlaceShapeActionAttributes>(currentTag)

								if (
									!attributes['shape-id'] ||
									!attributes['reference-shape-id'] ||
									!attributes['side'] ||
									!attributes['align'] ||
									!attributes['side-offset'] ||
									!attributes['align-offset']
								) {
									// console.warn(
									// 	`Place shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'place-shape' as const,
									shapeId: attributes['shape-id'],
									referenceShapeId: attributes['reference-shape-id'],
									side: attributes['side'],
									sideOffset: +attributes['side-offset'],
									align: attributes['align'],
									alignOffset: +attributes['align-offset'],
								})
								break
							}
							// stack-shapes
							case 'stack-shapes': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlStackShapesActionAttributes>(currentTag)

								const shapeIds = attributes['shape-ids'].split(',')

								if (
									!attributes['shape-ids'] ||
									!attributes['direction'] ||
									!attributes['align'] ||
									!attributes['gap'] ||
									shapeIds.length < 2
								) {
									// console.warn(
									// 	`Stack shapes missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'stack-shapes' as const,
									shapeIds: shapeIds,
									direction: attributes['direction'],
									align: attributes['align'],
									gap: +attributes['gap'],
								})
								break
							}
							// create-shapes (legacy geo tag removed - use individual shape tags instead)
							// Individual geo types
							case 'rectangle': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlRectangleShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'rectangle')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'ellipse': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlEllipseShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'ellipse')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'triangle': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlTriangleShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'triangle')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'diamond': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlDiamondShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'diamond')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'pentagon': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlPentagonShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'pentagon')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'hexagon': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlHexagonShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'hexagon')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'octagon': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlOctagonShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'octagon')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'star': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlStarShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'star')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'rhombus': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlRhombusShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'rhombus')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'rhombus-2': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlRhombus2ShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'rhombus-2')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'oval': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlOvalShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'oval')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'trapezoid': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlTrapezoidShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'trapezoid')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'arrow-right': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlArrowRightShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'arrow-right')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'arrow-left': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlArrowLeftShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'arrow-left')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'arrow-up': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlArrowUpShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'arrow-up')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'arrow-down': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlArrowDownShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'arrow-down')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'x-box': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlXBoxShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'x-box')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'check-box': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlCheckBoxShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'check-box')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'heart': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlHeartShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'heart')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'cloud': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlCloudShapeAttributes>(currentTag)
								try {
									const shape = this.createGeoShape(attributes, 'cloud')
									completedItems.push({
										type: 'create-shape',
										shape: shape as IShape,
									})
								} catch (_error) {
									// Skip invalid shapes
								}
								break
							}
							case 'text': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlTextShapeAttributes>(currentTag)

								if (!attributes.id || !attributes.x || !attributes.y || !attributes.text) {
									// console.warn(
									// 	`Text shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								const shape: ITextShape = {
									id: attributes.id,
									type: 'text',
									x: +attributes.x,
									y: +attributes.y,
									text: attributes.text || '',
								}

								// Add optional attributes if present
								if (attributes.color) shape.color = attributes.color

								completedItems.push({
									type: 'create-shape',
									shape: shape as IShape,
								})
								break
							}
							case 'note': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlNoteShapeAttributes>(currentTag)

								if (!attributes.id || !attributes.x || !attributes.y) {
									// console.warn(
									// 	`Note shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								const shape: INoteShape = {
									id: attributes.id,
									type: 'note',
									x: +attributes.x,
									y: +attributes.y,
									text: attributes.text || '',
								}

								// Add optional attributes if present
								if (attributes.color) shape.color = attributes.color
								if (attributes.labelColor) shape.labelColor = attributes.labelColor
								if (attributes.size) shape.size = attributes.size
								if (attributes.font) shape.font = attributes.font
								if (attributes.fontSizeAdjustment)
									shape.fontSizeAdjustment = +attributes.fontSizeAdjustment
								if (attributes.align) shape.align = attributes.align
								if (attributes.verticalAlign) shape.verticalAlign = attributes.verticalAlign
								if (attributes.scale) shape.scale = +attributes.scale
								if (attributes.growY) shape.growY = +attributes.growY
								if (attributes.url) shape.url = attributes.url

								completedItems.push({
									type: 'create-shape',
									shape: shape as IShape,
								})
								break
							}
							case 'frame': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlFrameShapeAttributes>(currentTag)

								if (!attributes.id || !attributes.x || !attributes.y) {
									// console.warn(
									// 	`Frame shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								const shape: IFrameShape = {
									id: attributes.id,
									type: 'frame',
									x: +attributes.x,
									y: +attributes.y,
									width: attributes.width ? +attributes.width : 100,
									height: attributes.height ? +attributes.height : 100,
									name: attributes.name || '',
								}

								// Add optional attributes if present
								if (attributes.color) shape.color = attributes.color

								completedItems.push({
									type: 'create-shape',
									shape: shape as IShape,
								})
								break
							}
							case 'line': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlLineShapeAttributes>(currentTag)

								if (!attributes.id || !attributes.x || !attributes.y) {
									// console.warn(
									// 	`Line shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								const shape: ILineShape = {
									id: attributes.id,
									type: 'line',
									x: +attributes.x,
									y: +attributes.y,
									points: [
										{
											id: `${attributes.id}_start`,
											x: attributes.startX ? +attributes.startX : 0,
											y: attributes.startY ? +attributes.startY : 0,
										},
										{
											id: `${attributes.id}_end`,
											x: attributes.endX ? +attributes.endX : 100,
											y: attributes.endY ? +attributes.endY : 0,
										},
									],
								}

								// Add optional attributes if present
								if (attributes.color) shape.color = attributes.color
								if (attributes.dash) shape.dash = attributes.dash
								if (attributes.size) shape.size = attributes.size
								if (attributes.spline) shape.spline = attributes.spline
								if (attributes.scale) shape.scale = +attributes.scale

								completedItems.push({
									type: 'create-shape',
									shape: shape as IShape,
								})
								break
							}
							case 'highlight': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlHighlightShapeAttributes>(currentTag)

								if (!attributes.id || !attributes.x || !attributes.y) {
									// console.warn(
									// 	`Highlight shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								const shape: IHighlightShape = {
									id: attributes.id,
									type: 'highlight',
									x: +attributes.x,
									y: +attributes.y,
									points: [],
								}

								// Add optional attributes if present
								if (attributes.color) shape.color = attributes.color
								if (attributes.size) shape.size = attributes.size
								if (attributes.scale) shape.scale = +attributes.scale
								if (attributes.isComplete !== undefined)
									shape.isComplete = attributes.isComplete === 'true'
								if (attributes.isPen !== undefined) shape.isPen = attributes.isPen === 'true'

								completedItems.push({
									type: 'create-shape',
									shape: shape as IShape,
								})
								break
							}
							default: {
								// caught something weird!
								return completedItems
							}
						}

						currentTag = ''
						currentTagName = ''
						state = 'searching'
					}

					break
				}
			}
			prevChar = char
		}

		return completedItems
	}

	/**
	 * Parse attributes from an XML string. The string will look something like `<geo id="123" x="100" y="100"/>`
	 */
	private parseAttributesFromXmlTag<T extends IXMLAttributes>(xmlString: string): T {
		// parse attributes out of the xml tag
		const element = this.parser.parseFromString(xmlString, 'text/xml').documentElement
		const attributes = element.attributes

		const result = {} as T

		for (let i = 0; i < attributes.length; i++) {
			const attribute = attributes[i]
			const name = attribute.name
			const value = attribute.value

			// @ts-expect-error
			result[name] = value
		}

		return result
	}

	/**
	 * Helper function to create a geo shape from attributes and geo type
	 */
	private createGeoShape(attributes: any, geoType: string): IGeoShape {
		if (!attributes.id || !attributes.x || !attributes.y) {
			throw new Error(
				`Geo shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
			)
		}

		const shape: IGeoShape = {
			id: attributes.id,
			type: 'geo',
			x: +attributes.x,
			y: +attributes.y,
			text: attributes.text || '',
			geo: geoType as any, // Set the geo type based on the XML tag
		}

		// Add optional attributes if present
		if (attributes.width) shape.width = +attributes.width
		if (attributes.height) shape.height = +attributes.height
		if (attributes.fill) shape.fill = attributes.fill
		if (attributes.color) shape.color = attributes.color
		if (attributes.labelColor) shape.labelColor = attributes.labelColor
		if (attributes.dash) shape.dash = attributes.dash
		if (attributes.size) shape.size = attributes.size
		if (attributes.font) shape.font = attributes.font
		if (attributes.align) shape.align = attributes.align
		if (attributes.verticalAlign) shape.verticalAlign = attributes.verticalAlign
		if (attributes.scale) shape.scale = +attributes.scale
		if (attributes.growY) shape.growY = +attributes.growY
		if (attributes.url) shape.url = attributes.url

		return shape
	}
}

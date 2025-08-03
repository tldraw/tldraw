import {
	IResponse,
	IShape,
	IXmlAlignShapesActionAttributes,
	IXMLAttributes,
	IXmlDeleteShapesActionAttributes,
	IXmlDistributeShapesActionAttributes,
	IXmlGeoShapeAttributes,
	IXmlLabelShapeActionAttributes,
	IXmlMoveShapeActionAttributes,
	IXmlPlaceShapeActionAttributes,
	IXmlStackShapesActionAttributes,
	IXmlTextShapeAttributes,
	IXmlThoughtActionAttributes,
} from './xml-parsed-types'

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

								if (
									!attributes['shape-ids'] ||
									!attributes['direction'] ||
									!attributes['gap'] ||
									shapeIds.length < 2
								) {
									// console.warn(
									// 	`Distribute shapes missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								completedItems.push({
									type: 'distribute-shapes' as const,
									shapeIds,
									direction: attributes['direction'],
									gap: +attributes['gap'],
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
							// create-shapes
							case 'geo': {
								const attributes =
									this.parseAttributesFromXmlTag<IXmlGeoShapeAttributes>(currentTag)

								if (!attributes.id || !attributes.x || !attributes.y) {
									// console.warn(
									// 	`Geo shape missing required attributes. Received: ${JSON.stringify(attributes, null, 2)}`
									// )
									break
								}

								const shape: any = {
									id: attributes.id,
									type: 'geo',
									x: +attributes.x,
									y: +attributes.y,
									text: attributes.text || '',
								}

								// Add optional attributes if present
								if (attributes.width) shape.width = +attributes.width
								if (attributes.height) shape.height = +attributes.height
								if (attributes.fill) shape.fill = attributes.fill
								if (attributes.color) shape.color = attributes.color

								completedItems.push({
									type: 'create-shape',
									shape: shape as IShape,
								})
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

								const shape: any = {
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
}

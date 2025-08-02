import { IResponse, IShape } from './xml-parsed-types'

export class XmlResponseParser {
	private readonly parser = new DOMParser()

	private _message: string = ''
	private _completedItems: IResponse = []
	private _processedShapeIds: Set<string> = new Set()
	private _processedAlignBlocks: Set<string> = new Set()
	// No longer need to track complete actions since we process individual shapes

	parseStream(chunk: string): IResponse {
		this._message += chunk

		// Extract only completed thoughts and actions from the current accumulated message
		return this.extractCompletedElements()
	}

	private extractCompletedElements(): IResponse {
		const newItems: IResponse = []

		// Extract completed thoughts
		const completedThoughts = this.extractCompletedThoughts()
		for (const thought of completedThoughts) {
			if (!this.isItemAlreadyProcessed(thought)) {
				newItems.push(thought)
				this._completedItems.push(thought)
			}
		}

		// Extract completed actions
		const completedActions = this.extractCompletedActions()
		for (const action of completedActions) {
			newItems.push(action)
			this._completedItems.push(action)
		}

		return newItems
	}

	private extractCompletedThoughts(): Array<{ type: 'thought'; text: string }> {
		const thoughts: Array<{ type: 'thought'; text: string }> = []

		// Find complete thought tags: <thought>...</thought>
		const thoughtRegex = /<thought>(.*?)<\/thought>/gs
		let match

		while ((match = thoughtRegex.exec(this._message)) !== null) {
			const text = match[1].trim()
			if (text) {
				thoughts.push({ type: 'thought', text })
			}
		}

		return thoughts
	}

	private extractCompletedActions(): IResponse {
		const actions: IResponse = []

		// Find complete individual shapes within open create blocks (even if </create> not closed yet)
		const createShapeActions = this.extractCompletedCreateShapes()
		actions.push(...createShapeActions)

		// Find complete individual shape deletions within open delete blocks (even if </delete> not closed yet)
		const deleteShapeActions = this.extractCompletedDeleteShapes()
		actions.push(...deleteShapeActions)

		// Find complete individual shape moves within open move blocks (even if </move> not closed yet)
		const moveShapeActions = this.extractCompletedMoveShapes()
		actions.push(...moveShapeActions)

		// Find complete individual shape labels within open label blocks (even if </label> not closed yet)
		const labelShapeActions = this.extractCompletedLabelShapes()
		actions.push(...labelShapeActions)

		// Find complete individual shape alignments within open align blocks (even if </align> not closed yet)
		const alignShapeActions = this.extractCompletedAlignShapes()
		actions.push(...alignShapeActions)

		// Find complete distribute-shapes actions
		const distributeShapeActions = this.extractCompletedDistributeShapes()
		actions.push(...distributeShapeActions)

		return actions
	}

	private extractCompletedCreateShapes(): IResponse {
		const actions: IResponse = []

		// Find all <create-shapes> blocks (both complete and incomplete)
		const createBlockRegex = /<create-shapes>(.*?)(?:<\/create-shapes>|$)/gs
		let createMatch

		while ((createMatch = createBlockRegex.exec(this._message)) !== null) {
			const createContent = createMatch[1]

			// Find all complete shape tags within this create block
			const shapeRegex = /<shape\s+([^>]*)\s*\/>/g
			let shapeMatch

			while ((shapeMatch = shapeRegex.exec(createContent)) !== null) {
				const attributes = shapeMatch[1]
				const shape = this.parseShapeAttributes(attributes)

				if (shape && !this._processedShapeIds.has(shape.id)) {
					actions.push({
						type: 'create-shape',
						shape,
					})
					this._processedShapeIds.add(shape.id)
				}
			}
		}

		return actions
	}

	private extractCompletedDeleteShapes(): IResponse {
		const actions: IResponse = []

		// Find all <delete-shapes> blocks (both complete and incomplete)
		const deleteBlockRegex = /<delete-shapes>(.*?)(?:<\/delete-shapes>|$)/gs
		let deleteMatch

		while ((deleteMatch = deleteBlockRegex.exec(this._message)) !== null) {
			const deleteContent = deleteMatch[1]

			// Find all complete shape tags within this delete block
			const shapeRegex = /<shape\s+([^>]*)\s*\/>/g
			let shapeMatch

			while ((shapeMatch = shapeRegex.exec(deleteContent)) !== null) {
				const attributes = shapeMatch[1]
				const idMatch = attributes.match(/id\s*=\s*["']([^"']+)["']/)

				if (idMatch && !this._processedShapeIds.has(idMatch[1])) {
					const shapeId = idMatch[1]
					actions.push({
						type: 'delete-shape',
						shapeId,
					})
					this._processedShapeIds.add(shapeId)
				}
			}
		}

		return actions
	}

	private extractCompletedMoveShapes(): IResponse {
		const actions: IResponse = []

		// Find all <move-shape> self-closing tags
		const moveBlockRegex = /<move-shape\s+([^>]*)\s*\/>/g
		let moveMatch

		while ((moveMatch = moveBlockRegex.exec(this._message)) !== null) {
			const attributes = moveMatch[1]
			const parsedMove = this.parseMoveShapeAttributes(attributes)

			if (parsedMove) {
				const moveAction = {
					type: 'move-shape' as const,
					shapeId: parsedMove.shapeId,
					x: parsedMove.x,
					y: parsedMove.y,
				}

				// Check if this exact move action has already been processed
				if (!this.isItemAlreadyProcessed(moveAction)) {
					actions.push(moveAction)
				}
			}
		}

		return actions
	}

	private extractCompletedLabelShapes(): IResponse {
		const actions: IResponse = []

		// Find all <label-shape> self-closing tags
		const labelBlockRegex = /<label-shape\s+([^>]*)\s*\/>/g
		let labelMatch

		while ((labelMatch = labelBlockRegex.exec(this._message)) !== null) {
			const attributes = labelMatch[1]
			const parsedLabel = this.parseLabelShapeAttributes(attributes)

			if (parsedLabel) {
				const labelAction = {
					type: 'label-shape' as const,
					shapeId: parsedLabel.shapeId,
					text: parsedLabel.text,
				}

				// Check if this exact label action has already been processed
				if (!this.isItemAlreadyProcessed(labelAction)) {
					actions.push(labelAction)
				}
			}
		}

		return actions
	}

	private extractCompletedAlignShapes(): IResponse {
		const actions: IResponse = []

		// Find all <align-shapes> self-closing tags
		const alignBlockRegex = /<align-shapes\s+([^>]*)\s*\/>/g
		let alignMatch

		while ((alignMatch = alignBlockRegex.exec(this._message)) !== null) {
			const attributes = alignMatch[1]
			const blockStartIndex = alignMatch.index!

			// Extract alignment and shape-ids from the align-shapes tag attributes
			const alignmentMatch = attributes.match(/alignment\s*=\s*["']([^"']+)["']/)
			const shapeIdsMatch = attributes.match(/shape-ids\s*=\s*["']([^"']+)["']/)

			const alignment = alignmentMatch ? alignmentMatch[1] : null
			const shapeIdsStr = shapeIdsMatch ? shapeIdsMatch[1] : null

			if (!alignment || !shapeIdsStr) {
				continue // Skip if missing required attributes
			}

			// Create a unique identifier for this align block
			const blockId = `${alignment}-${blockStartIndex}`

			// Skip if this align block has already been processed
			if (this._processedAlignBlocks.has(blockId)) {
				continue
			}

			// Parse shape IDs from comma-separated string
			const shapeIds = shapeIdsStr
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id.length > 0)

			// Create align action if we have at least 2 shapes and valid alignment
			if (shapeIds.length >= 2 && this.isValidAlignment(alignment)) {
				const alignAction = {
					type: 'align-shapes' as const,
					shapeIds,
					alignment: alignment as 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y',
				}

				// Mark this align block as processed
				this._processedAlignBlocks.add(blockId)
				actions.push(alignAction)
			}
		}

		return actions
	}

	private isValidAlignment(
		alignment: string
	): alignment is 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y' {
		return ['top', 'bottom', 'left', 'right', 'center-x', 'center-y'].includes(alignment)
	}

	private extractCompletedDistributeShapes(): IResponse {
		const actions: IResponse = []

		// Find all <distribute-shapes> self-closing tags
		const distributeBlockRegex = /<distribute-shapes\s+([^>]*)\s*\/>/g
		let distributeMatch

		while ((distributeMatch = distributeBlockRegex.exec(this._message)) !== null) {
			const attributes = distributeMatch[1]
			const blockStartIndex = distributeMatch.index!

			// Extract direction and shape-ids from the distribute-shapes tag attributes
			const directionMatch = attributes.match(/direction\s*=\s*["']([^"']+)["']/)
			const shapeIdsMatch = attributes.match(/shape-ids\s*=\s*["']([^"']+)["']/)
			const gapMatch = attributes.match(/gap\s*=\s*["']([^"']+)["']/)

			const direction = directionMatch ? directionMatch[1] : null
			const shapeIdsStr = shapeIdsMatch ? shapeIdsMatch[1] : null
			const gap = gapMatch ? parseFloat(gapMatch[1]) : 0

			if (!direction || !shapeIdsStr) {
				continue // Skip if missing required attributes
			}

			// Create a unique identifier for this distribute block
			const blockId = `${direction}-${blockStartIndex}`

			// Skip if this distribute block has already been processed
			if (this._processedAlignBlocks.has(blockId)) {
				continue
			}

			// Parse shape IDs from comma-separated string
			const shapeIds = shapeIdsStr
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id.length > 0)

			// Create distribute action if we have at least 2 shapes and valid direction
			if (shapeIds.length >= 2 && this.isValidDirection(direction)) {
				const distributeAction = {
					type: 'distribute-shapes' as const,
					shapeIds,
					direction: direction as 'vertical' | 'horizontal',
					gap,
				}

				// Mark this distribute block as processed
				this._processedAlignBlocks.add(blockId)
				actions.push(distributeAction)
			}
		}

		return actions
	}

	private isValidDirection(direction: string): direction is 'vertical' | 'horizontal' {
		return ['vertical', 'horizontal'].includes(direction)
	}

	private parseLabelShapeAttributes(
		attributeString: string
	): { shapeId: string; text: string } | null {
		const getAttr = (name: string): string | null => {
			const match = attributeString.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`))
			return match ? match[1] : null
		}

		const id = getAttr('id')
		const text = getAttr('text') || ''

		if (!id) {
			return null
		}

		return { shapeId: id, text }
	}

	private parseMoveShapeAttributes(
		attributeString: string
	): { shapeId: string; x: number; y: number } | null {
		const getAttr = (name: string): string | null => {
			const match = attributeString.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`))
			return match ? match[1] : null
		}

		const id = getAttr('id')
		const x = parseFloat(getAttr('x') || '0')
		const y = parseFloat(getAttr('y') || '0')

		if (!id) {
			return null
		}

		return { shapeId: id, x, y }
	}

	// No longer need these functions since we process shapes individually within action blocks

	private parseShapeAttributes(attributeString: string): IShape | null {
		const getAttr = (name: string): string | null => {
			const match = attributeString.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`))
			return match ? match[1] : null
		}

		const id = getAttr('id')
		const type = getAttr('type')
		const x = parseFloat(getAttr('x') || '0')
		const y = parseFloat(getAttr('y') || '0')

		if (!id || !type) {
			return null
		}

		if (type === 'geo') {
			return { id, type: 'geo', x, y }
		} else if (type === 'text') {
			const text = getAttr('text') || ''
			return { id, type: 'text', x, y, text }
		}

		return null
	}

	getCompletedItems(): IResponse {
		return this._completedItems
	}

	reset(): void {
		this._message = ''
		this._completedItems = []
		this._processedShapeIds.clear()
		this._processedAlignBlocks.clear()
	}

	private makeTemporarilyCloseable(message: string): string {
		// Add minimal closing tags to make incomplete XML parseable
		let result = message

		// Handle incomplete shape tag (like: <shape id="124" type="geo" x="300" y="200" wid)
		const incompleteShapeMatch = result.match(/<shape\s[^>]*$/)
		if (incompleteShapeMatch) {
			// Close the incomplete shape tag
			result += ' />'
		}

		// Find all complete tags and track open/close state
		const openTags: string[] = []
		const tagRegex = /<(\/?)([\w-]+)(?:\s[^>]*)?>/g
		let match

		// Reset regex index for fresh scan
		tagRegex.lastIndex = 0

		while ((match = tagRegex.exec(result)) !== null) {
			const isClosing = match[1] === '/'
			const tagName = match[2]

			if (isClosing) {
				// Remove from open tags stack
				const index = openTags.lastIndexOf(tagName)
				if (index !== -1) {
					openTags.splice(index, 1)
				}
			} else if (!match[0].endsWith('/>')) {
				// Add to open tags (only if not self-closing)
				openTags.push(tagName)
			}
		}

		// Close remaining open tags in reverse order
		for (let i = openTags.length - 1; i >= 0; i--) {
			result += `</${openTags[i]}>`
		}

		return result
	}

	private isItemAlreadyProcessed(item: IResponse[0]): boolean {
		return this._completedItems.some((processedItem) => {
			if ('text' in item && 'text' in processedItem) {
				return item.text === processedItem.text
			}
			if ('type' in item && 'type' in processedItem) {
				if (item.type !== processedItem.type) return false

				if (item.type === 'create-shape' && processedItem.type === 'create-shape') {
					return JSON.stringify(item.shape) === JSON.stringify(processedItem.shape)
				}
				if (item.type === 'delete-shape' && processedItem.type === 'delete-shape') {
					return item.shapeId === processedItem.shapeId
				}
				if (item.type === 'move-shape' && processedItem.type === 'move-shape') {
					return (
						item.shapeId === processedItem.shapeId &&
						item.x === processedItem.x &&
						item.y === processedItem.y
					)
				}
				if (item.type === 'label-shape' && processedItem.type === 'label-shape') {
					return item.shapeId === processedItem.shapeId && item.text === processedItem.text
				}
				if (item.type === 'align-shapes' && processedItem.type === 'align-shapes') {
					return (
						item.alignment === processedItem.alignment &&
						JSON.stringify(item.shapeIds.sort()) === JSON.stringify(processedItem.shapeIds.sort())
					)
				}
			}
			return false
		})
	}

	/**
	 * Parse a completed XML responses, something like:
	 *
	 * <response>
	 * 	<thoughts>
	 * 		<thought>I need to create a rectangle</thought>
	 * 	</thoughts>
	 * 	<actions>
	 * 		<create>
	 * 			<shape id="123" type="geo" x="100" y="100" width="100" height="100" color="black" fill="none" />
	 * 			<shape id="124" type="geo" x="300" y="200" width="100" height="100" color="red" fill="solid" />
	 * 		</create>
	 * 	</actions>
	 * 	<thoughts>
	 * 		<thought>I need to create some text</thought>
	 * 	</thoughts>
	 * 	<actions>
	 * 		<create>
	 * 			<shape id="123" type="text" x="100" y="100" text="Hello, world!" />
	 * 		</create>
	 * 	</actions>
	 * 	<thoughts>
	 * 		<thought>I need to delete the rectangle</thought>
	 * 	</thoughts>
	 * 	<actions>
	 * 		<delete>
	 * 			<shape id="123" />
	 * 		</delete>
	 * 	</actions>
	 * </response>
	 */
	parseCompletedStream(message: string): IResponse {
		const result: IResponse = []

		const xml = this.parser.parseFromString(message, 'application/xml')

		// Check for parsing errors
		const parseError = xml.querySelector('parsererror')
		if (parseError) {
			throw new Error(`XML parsing error: ${parseError.textContent}`)
		}

		// Within the response tag are some thoughts and actions.
		// We want to collect them into the result object.
		// The order matters, so we need to collect them in the correct order.
		const responseObj = xml.querySelector('response')
		if (!responseObj) {
			throw new Error('Invalid XML response')
		}

		// Iterate through all direct children of the response element in order
		for (const child of responseObj.children) {
			const tagName = child.tagName.toLowerCase()

			if (tagName === 'thoughts') {
				// Extract all thought elements
				const thoughtElements = child.querySelectorAll('thought')
				for (const thoughtElement of thoughtElements) {
					const text = thoughtElement.textContent?.trim() || ''
					if (text) {
						result.push({ type: 'thought', text })
					}
				}
			} else if (tagName === 'actions') {
				// Extract action elements (create or delete)
				for (const actionChild of child.children) {
					const actionType = actionChild.tagName.toLowerCase()

					if (actionType === 'create-shapes') {
						const shapes = this.parseShapes(actionChild)
						// Return individual create-shape actions for each shape
						for (const shape of shapes) {
							result.push({
								type: 'create-shape',
								shape,
							})
						}
					} else if (actionType === 'delete-shapes') {
						const shapeIds = this.parseShapeIds(actionChild)
						// Return individual delete-shape actions for each shape
						for (const shapeId of shapeIds) {
							result.push({
								type: 'delete-shape',
								shapeId,
							})
						}
					} else if (actionType === 'move-shape') {
						const moveAction = this.parseMoveShape(actionChild)
						if (moveAction) {
							result.push(moveAction)
						}
					} else if (actionType === 'label-shape') {
						const labelAction = this.parseLabelShape(actionChild)
						if (labelAction) {
							result.push(labelAction)
						}
					} else if (actionType === 'align-shapes') {
						const alignAction = this.parseAlignShapesNew(actionChild)
						if (alignAction) {
							result.push(alignAction)
						}
					} else if (actionType === 'distribute-shapes') {
						const distributeAction = this.parseDistributeShapes(actionChild)
						if (distributeAction) {
							result.push(distributeAction)
						}
					}
				}
			}
		}

		return result
	}

	private parseShapes(createElement: Element): IShape[] {
		const shapes: IShape[] = []

		const shapeElements = createElement.querySelectorAll('shape')
		for (const shapeElement of shapeElements) {
			const id = shapeElement.getAttribute('id')
			const type = shapeElement.getAttribute('type')
			const x = parseFloat(shapeElement.getAttribute('x') || '0')
			const y = parseFloat(shapeElement.getAttribute('y') || '0')

			if (!id || !type) {
				continue // Skip invalid shapes
			}

			if (type === 'geo') {
				shapes.push({
					id,
					type: 'geo',
					x,
					y,
				})
			} else if (type === 'text') {
				const text = shapeElement.getAttribute('text') || ''
				shapes.push({
					id,
					type: 'text',
					x,
					y,
					text,
				})
			}
		}

		return shapes
	}

	private parseShapeIds(deleteElement: Element): string[] {
		const shapeIds: string[] = []

		const shapeElements = deleteElement.querySelectorAll('shape')
		for (const shapeElement of shapeElements) {
			const id = shapeElement.getAttribute('id')
			if (id) {
				shapeIds.push(id)
			}
		}

		return shapeIds
	}

	private parseMoveShapes(moveElement: Element): Array<{ shapeId: string; x: number; y: number }> {
		const moveShapes: Array<{ shapeId: string; x: number; y: number }> = []

		const shapeElements = moveElement.querySelectorAll('shape')
		for (const shapeElement of shapeElements) {
			const id = shapeElement.getAttribute('id')
			const x = parseFloat(shapeElement.getAttribute('x') || '0')
			const y = parseFloat(shapeElement.getAttribute('y') || '0')

			if (id) {
				moveShapes.push({ shapeId: id, x, y })
			}
		}

		return moveShapes
	}

	private parseLabelShapes(labelElement: Element): Array<{ shapeId: string; text: string }> {
		const labelShapes: Array<{ shapeId: string; text: string }> = []

		const shapeElements = labelElement.querySelectorAll('shape')
		for (const shapeElement of shapeElements) {
			const id = shapeElement.getAttribute('id')
			const text = shapeElement.getAttribute('text') || ''

			if (id) {
				labelShapes.push({ shapeId: id, text })
			}
		}

		return labelShapes
	}

	private parseAlignShapes(alignElement: Element): {
		type: 'align-shapes'
		shapeIds: string[]
		alignment: 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y'
	} | null {
		// Get the alignment attribute from the align element
		const alignment = alignElement.getAttribute('alignment')

		if (!alignment || !this.isValidAlignment(alignment)) {
			return null
		}

		// Extract shape IDs from child shape elements
		const shapeIds: string[] = []
		const shapeElements = alignElement.querySelectorAll('shape')
		for (const shapeElement of shapeElements) {
			const id = shapeElement.getAttribute('id')
			if (id) {
				shapeIds.push(id)
			}
		}

		// Need at least 2 shapes to align
		if (shapeIds.length < 2) {
			return null
		}

		return {
			type: 'align-shapes',
			shapeIds,
			alignment: alignment as 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y',
		}
	}

	private parseMoveShape(
		moveElement: Element
	): { type: 'move-shape'; shapeId: string; x: number; y: number } | null {
		const shapeId = moveElement.getAttribute('shape-id')
		const x = parseFloat(moveElement.getAttribute('x') || '0')
		const y = parseFloat(moveElement.getAttribute('y') || '0')

		if (!shapeId) {
			return null
		}

		return {
			type: 'move-shape',
			shapeId,
			x,
			y,
		}
	}

	private parseLabelShape(
		labelElement: Element
	): { type: 'label-shape'; shapeId: string; text: string } | null {
		const shapeId = labelElement.getAttribute('shape-id')
		const text = labelElement.getAttribute('text') || ''

		if (!shapeId) {
			return null
		}

		return {
			type: 'label-shape',
			shapeId,
			text,
		}
	}

	private parseAlignShapesNew(alignElement: Element): {
		type: 'align-shapes'
		shapeIds: string[]
		alignment: 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y'
	} | null {
		const alignment = alignElement.getAttribute('alignment')
		const shapeIdsStr = alignElement.getAttribute('shape-ids')

		if (!alignment || !shapeIdsStr || !this.isValidAlignment(alignment)) {
			return null
		}

		const shapeIds = shapeIdsStr
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0)

		if (shapeIds.length < 2) {
			return null
		}

		return {
			type: 'align-shapes',
			shapeIds,
			alignment: alignment as 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y',
		}
	}

	private parseDistributeShapes(distributeElement: Element): {
		type: 'distribute-shapes'
		shapeIds: string[]
		direction: 'vertical' | 'horizontal'
		gap: number
	} | null {
		const direction = distributeElement.getAttribute('direction')
		const shapeIdsStr = distributeElement.getAttribute('shape-ids')
		const gap = parseFloat(distributeElement.getAttribute('gap') || '0')

		if (!direction || !shapeIdsStr || !this.isValidDirection(direction)) {
			return null
		}

		const shapeIds = shapeIdsStr
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0)

		if (shapeIds.length < 2) {
			return null
		}

		return {
			type: 'distribute-shapes',
			shapeIds,
			direction: direction as 'vertical' | 'horizontal',
			gap,
		}
	}
}

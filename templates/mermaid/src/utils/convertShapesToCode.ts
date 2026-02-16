/**
 * Convert tldraw shapes to Mermaid code using Gemini vision API
 */

import { Editor, Vec } from 'tldraw'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from './logger'
import exampleFlowchartUrl from '../assets/example-flowchart.png'
import exampleSequenceUrl from '../assets/example-sequence.png'

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

/**
 * Convert selected shapes to Mermaid code using Gemini vision
 * @returns The code block ID (either updated or newly created)
 */
export async function convertShapesToCode(
	editor: Editor,
	shapeIds: string[]
): Promise<{ code: string; codeBlockId: string }> {
	if (!genAI) {
		throw new Error(
			'Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file'
		)
	}

	// If a link frame is selected, get its children shapes instead
	let shapesToConvert: string[] = []
	for (const id of shapeIds) {
		const shape = editor.getShape(id)
		if (shape?.type === 'frame' && shape.meta?.isLinkFrame) {
			// Get all children of the frame
			const children = editor.getSortedChildIdsForParent(id)
			shapesToConvert.push(...children)
			console.log('Link frame selected, using', children.length, 'children shapes')
		} else {
			shapesToConvert.push(id)
		}
	}

	// Filter out code block shapes
	const filteredShapeIds = shapesToConvert.filter((id) => {
		const shape = editor.getShape(id)
		return shape && shape.type !== 'code-block'
	})

	if (filteredShapeIds.length === 0) {
		throw new Error('No diagram shapes selected (code blocks are excluded)')
	}

	logger.shapesToCode(filteredShapeIds.length)

	// Load example images if not already loaded
	await loadExampleImages()

	try {
		// Export only geo shapes (nodes) to avoid arrow label SVG export errors
		// TODO: Fix arrow label bounds issue in tldraw, then export all shapes
		const geoShapeIds = filteredShapeIds.filter((id) => {
			const shape = editor.getShape(id)
			return shape?.type === 'geo'
		})

		if (geoShapeIds.length === 0) {
			throw new Error('No geo shapes (nodes) found to export')
		}

		console.log(
			'Exporting',
			geoShapeIds.length,
			'geo shapes (arrows excluded due to label rendering issues)'
		)

		const result = await editor.toImage(geoShapeIds, {
			background: true,
			padding: 16,
			darkMode: false,
			format: 'png',
		})

		if (!result || !result.blob) {
			throw new Error('Could not export shapes as image')
		}

		// Convert blob to base64
		const base64 = await blobToBase64(result.blob)
		const base64Data = base64.split(',')[1] // Remove data:image/png;base64, prefix

		logger.geminiRequest(
			'Generate Mermaid diagram code from this image',
			{
				width: result.width,
				height: result.height,
			}
		)

		// Call Gemini vision API
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

		const contentParts = [
			{
				text: `You are an expert at analyzing diagrams and generating Mermaid.js code.

Here are examples showing how diagrams map to Mermaid code:

Example 1 - Flowchart:
This diagram shows a flowchart flowing left-to-right with different node shapes:`,
			},
		]

		// Add example flowchart image if loaded
		if (exampleFlowchartBase64) {
			contentParts.push({
				inlineData: {
					mimeType: 'image/png',
					data: exampleFlowchartBase64,
				},
			})
		}

		contentParts.push({
			text: `The correct Mermaid code for this flowchart is:

flowchart LR
A[Hard] -->|Text| B(Round)
B --> C{Decision}
C -->|One| D[Result 1]
C -->|Two| E[Result 2]

Example 2 - Sequence Diagram:
This diagram shows a sequence diagram with participants, messages, loops, and notes:`,
		})

		// Add example sequence image if loaded
		if (exampleSequenceBase64) {
			contentParts.push({
				inlineData: {
					mimeType: 'image/png',
					data: exampleSequenceBase64,
				},
			})
		}

		contentParts.push({
			text: `The correct Mermaid code for this sequence diagram is:

sequenceDiagram
Alice->>John: Hello John, how are you?
loop HealthCheck
    John->>John: Fight against hypochondria
end
Note right of John: Rational thoughts!
John-->>Alice: Great!
John->>Bob: How about you?
Bob-->>John: Jolly good!

Key points for generating Mermaid code:
- Identify the diagram type (flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram)
- For flowcharts: detect direction (LR, RL, TB, BT) from the layout
- Use correct node syntax: [square], (rounded), {diamond}, ((circle)), {{hexagon}}
- Use SIMPLE node IDs: prefer A, B, C over A_node, B_node, C_node
- INLINE node definitions in edges when possible: A[Label] --> B[Label]
- Avoid standalone node definitions - define nodes directly in edges
- If the same node appears multiple times, omit the label after first use: A[Label] --> B[Label], A --> C[Label]
- Pay attention to arrow types and directions carefully
- Include labels where present
- Only include connections that actually exist in the diagram

Now analyze THIS diagram and generate the Mermaid code:`,
		})

		// Add the user's diagram
		contentParts.push({
			inlineData: {
				mimeType: 'image/png',
				data: base64Data,
			},
		})

		contentParts.push({
			text: 'Return ONLY the Mermaid code, without markdown code fences or explanations.',
		})

		const geminiResult = await model.generateContent(contentParts)

		const response = geminiResult.response
		const code = response.text().trim()

		logger.geminiResponse(code)

		// Check if any of the shapes are linked to a code block
		let linkedCodeBlockId: string | null = null
		for (const shapeId of filteredShapeIds) {
			const shape = editor.getShape(shapeId)
			console.log('Checking shape for link:', shapeId, 'type:', shape?.type, 'meta:', shape?.meta)

			// If this is a link frame, use its linkedCodeBlockId
			if (shape?.type === 'frame' && shape.meta?.isLinkFrame && shape.meta?.linkedCodeBlockId) {
				linkedCodeBlockId = shape.meta.linkedCodeBlockId as string
				console.log('Found link frame, linked to code block:', linkedCodeBlockId)
				break
			}

			// Otherwise check for codeBlockId on the shape itself
			if (shape?.meta?.codeBlockId) {
				linkedCodeBlockId = shape.meta.codeBlockId as string
				console.log('Found linked code block via codeBlockId:', linkedCodeBlockId)
				break
			}
		}
		console.log('Final linked code block ID:', linkedCodeBlockId)

		// If linked to an existing code block, update it
		if (linkedCodeBlockId && editor.getShape(linkedCodeBlockId)) {
			const codeBlock = editor.getShape(linkedCodeBlockId)
			editor.updateShape({
				id: linkedCodeBlockId,
				type: codeBlock!.type,
				props: {
					code,
				},
			})
			logger.success(`Updated linked code block ${linkedCodeBlockId}`)
			return { code, codeBlockId: linkedCodeBlockId }
		}

		// Otherwise return the code to create a new code block
		return { code, codeBlockId: '' }
	} catch (error) {
		logger.error('convertShapesToCode', error)
		throw error
	}
}

/**
 * Convert blob to base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

/**
 * Convert image URL to base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
	const response = await fetch(url)
	const blob = await response.blob()
	const base64 = await blobToBase64(blob)
	return base64.split(',')[1] // Remove data:image/png;base64, prefix
}

// Load example images once at module level
let exampleImagesLoaded = false
let exampleFlowchartBase64 = ''
let exampleSequenceBase64 = ''

async function loadExampleImages() {
	if (exampleImagesLoaded) return
	try {
		exampleFlowchartBase64 = await imageUrlToBase64(exampleFlowchartUrl)
		exampleSequenceBase64 = await imageUrlToBase64(exampleSequenceUrl)
		exampleImagesLoaded = true
	} catch (error) {
		console.error('Failed to load example images:', error)
	}
}

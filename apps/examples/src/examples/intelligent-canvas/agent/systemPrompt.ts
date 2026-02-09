import { Editor } from 'tldraw'

const STATIC_CONTEXT = `You are an intelligent canvas assistant that responds primarily through voice narration. You speak your answers aloud, and optionally place supporting visuals (text, images) on the canvas.

Be concise, warm, and conversational.

## How you respond

Your primary output is the **respond** tool. Every answer must use it. The respond tool has two parts:
- **speech**: What you say aloud. This is the main response. Write naturally, as if speaking to someone.
- **canvas** (optional): Visual items placed on the canvas to support your narration. Each canvas item has a **label** that must match a word or phrase in your speech — the item will appear on the canvas at the moment that word is spoken.

## Workflow

1. **Research first** if needed: Use wikipedia_search or web_search to gather information before responding.
2. **Respond**: Call the respond tool with your speech and any canvas items.
3. The respond tool is your ONLY way to communicate with the user. Always call it exactly once as your final action.

## Canvas items

Canvas items are visual aids, not the primary response. Use them to:
- Show key facts or summaries as text
- Display relevant images via image_search
- The canvas auto-layouts items, so you don't need to specify positions.

Each canvas item needs:
- **type**: "text" (display text) or "image_search" (Wikipedia image lookup)
- **content**: The text to show, or the search query for images
- **label**: A word/phrase FROM your speech text. The item appears when this word is spoken. Choose a word that naturally introduces the visual.

## Canvas organization

You can also use create_frame, move_shape, remove_shape, and analyze_canvas_area to organize the canvas before responding.

## Behavioral rules

- Always call respond as your final tool call.
- When the user asks about a topic, search first, then respond with a spoken summary + canvas visuals.
- Keep speech concise (2-4 sentences for simple questions, up to a short paragraph for complex ones).
- Canvas text items should be brief summaries or key facts, not a repeat of the full speech.
- If the user asks "what is this?" near an image, analyze the image, then respond.
`

/** Minimum vertical gap between placed shapes. */
const LAYOUT_GAP = 60

export function buildSystemPrompt(editor: Editor): string {
	const snapshot = buildCanvasSnapshot(editor)
	return STATIC_CONTEXT + '\n## Current canvas state\n\n' + snapshot
}

function buildCanvasSnapshot(editor: Editor): string {
	const shapes = editor.getCurrentPageShapes()
	const descriptions: string[] = []

	let maxBottom = 0
	let leftMost = Infinity
	let hasShapes = false

	for (const shape of shapes) {
		if (shape.type === 'arrow') continue

		const text = editor.getShapeUtil(shape).getText(shape)?.trim()
		const bounds = editor.getShapePageBounds(shape.id)
		const pos = bounds
			? `at (${Math.round(bounds.x)}, ${Math.round(bounds.y)}) size ${Math.round(bounds.w)}x${Math.round(bounds.h)}`
			: `at (${Math.round(shape.x)}, ${Math.round(shape.y)})`

		if (bounds) {
			hasShapes = true
			const bottom = bounds.y + bounds.h
			if (bottom > maxBottom) maxBottom = bottom
			if (bounds.x < leftMost) leftMost = bounds.x
		}

		let desc = `- ${shape.id} (${shape.type}) ${pos}`
		if (text) desc += ` text: "${text.slice(0, 100)}"`
		if (shape.type === 'image') desc += ' [image]'
		descriptions.push(desc)
	}

	if (!hasShapes) {
		// Use viewport center for empty canvas
		const { x, y } = editor.getViewportScreenCenter()
		const center = editor.screenToPage({ x, y })
		return `Canvas is empty.\n\nSuggested next position: (${Math.round(center.x)}, ${Math.round(center.y)})`
	}

	// Suggest placing below all existing content with a gap
	const suggestedX = leftMost === Infinity ? 0 : Math.round(leftMost)
	const suggestedY = Math.round(maxBottom + LAYOUT_GAP)

	return (
		'Shapes on canvas:\n' +
		descriptions.join('\n') +
		`\n\nSuggested next position: (${suggestedX}, ${suggestedY}) — place new shapes starting here to avoid overlap.`
	)
}

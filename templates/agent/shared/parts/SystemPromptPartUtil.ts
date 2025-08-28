import { buildResponseJsonSchema } from '../../worker/prompt/buildResponseJsonSchema'
import { EVENT_UTILS, PROMPT_PART_UTILS } from '../AgentUtils'
import { BlurryShape } from '../format/BlurryShape'
import { ISimpleShape } from '../format/SimpleShape'
import { AgentAction } from '../types/AgentAction'
import { AgentPrompt } from '../types/AgentPrompt'
import { PromptPartUtil, PromptPartUtilConstructor } from './PromptPartUtil'

export class SystemPromptPartUtil extends PromptPartUtil<null> {
	static override type = 'system' as const

	override async getPart() {
		return null
	}

	override buildSystemMessage(_part: null, prompt: AgentPrompt) {
		const includedAgentActionTypes: AgentAction['_type'][] = EVENT_UTILS.map((util) => util.type)
		const includedPromptPartTypes: PromptPartUtilConstructor['type'][] = PROMPT_PART_UTILS.map(
			(util) => util.type
		)

		const systemPromptModifiers: string[] = []

		// if there are user selected shapes add that to the system prompt modifiers
		const userSelectedShapes: ISimpleShape[] | undefined = prompt.userSelectedShapes
		if (userSelectedShapes && userSelectedShapes.length > 0) {
			systemPromptModifiers.push('user-has-selection')
		}

		// if there are arrows in the shapes on screen, add that to the system prompt modifiers
		const blurryFormat: BlurryShape[] | undefined = prompt.blurryFormat
		if (blurryFormat && blurryFormat.length > 0) {
			if (blurryFormat.some((shape) => shape.type === 'arrow')) {
				systemPromptModifiers.push('contains_arrows')
			}
		}

		console.log(
			getSystemPrompt(
				systemPromptModifiers,
				includedAgentActionTypes,
				includedPromptPartTypes,
				false
			)
		)

		return getSystemPrompt(systemPromptModifiers, includedAgentActionTypes, includedPromptPartTypes)
	}
}

// The system prompt is constructed from different sections. Depending on what prompt parts and agent actions are included, different sections (and different parts of the sections) are included. If all subsections of a section are not included, the section is not included.

/*
# System Prompt

## Schema Overview

## Shapes

## Event Schema

## Rules

## Useful notes

### General tips about the canvas

### Tips for creating and updating shapes

### Communicating with the user

### Starting your work

### Navigating the canvas

## Reviewing your work

### Finishing your work

## JSON Schema
*/

// Helper functions for determining what sections to include
interface SectionFlags {
	generalTipsAboutCanvas: boolean
	tipsForCreatingAndUpdatingShapes: boolean
	communicatingWithUser: boolean
	startingYourWork: boolean
	navigatingCanvas: boolean
	reviewingYourWork: boolean
	finishingYourWork: boolean
}

function getSectionFlags(
	modifiers: string[],
	includedAgentActionTypes: AgentAction['_type'][],
	includedPromptPartTypes: PromptPartUtilConstructor['type'][]
): SectionFlags {
	const highLevelActions: AgentAction['_type'][] = ['distribute', 'stack', 'align', 'place']
	const hasSomeHighLevelActions = highLevelActions.some((action) =>
		includedAgentActionTypes.includes(action)
	)

	const lowLevelActions: AgentAction['_type'][] = ['create', 'update', 'move']
	const hasSomeLowLevelActions = lowLevelActions.some((action) =>
		includedAgentActionTypes.includes(action)
	)

	return {
		generalTipsAboutCanvas: includedAgentActionTypes.includes('create'),
		tipsForCreatingAndUpdatingShapes:
			includedAgentActionTypes.includes('create') ||
			includedAgentActionTypes.includes('update') ||
			(includedAgentActionTypes.includes('move') && includedAgentActionTypes.includes('update')),
		communicatingWithUser:
			includedAgentActionTypes.includes('message') ||
			includedAgentActionTypes.includes('review') ||
			includedAgentActionTypes.includes('think'),
		startingYourWork:
			includedAgentActionTypes.includes('update-todo-list') ||
			includedAgentActionTypes.includes('think') ||
			(hasSomeHighLevelActions && hasSomeLowLevelActions) ||
			modifiers.includes('user-has-selection'),
		navigatingCanvas:
			includedAgentActionTypes.includes('setMyView') ||
			includedPromptPartTypes.includes('peripheralShapes') ||
			(includedAgentActionTypes.includes('create') &&
				includedAgentActionTypes.includes('update')) ||
			(includedPromptPartTypes.includes('userViewportBounds') &&
				includedPromptPartTypes.includes('agentViewportBounds')),
		reviewingYourWork:
			includedAgentActionTypes.includes('review') &&
			(includedAgentActionTypes.includes('create') ||
				includedAgentActionTypes.includes('update') ||
				includedAgentActionTypes.includes('move')),
		finishingYourWork: true,
	}
}

function getSystemPrompt(
	modifiers: string[],
	includedAgentActionTypes: AgentAction['_type'][],
	includedPromptPartTypes: PromptPartUtilConstructor['type'][],
	includeSchema = true
) {
	const flags = getSectionFlags(modifiers, includedAgentActionTypes, includedPromptPartTypes)

	const sections: string[] = []

	sections.push(buildCoreSystemPrompt(includedPromptPartTypes))
	sections.push(buildShapesSection())

	sections.push(buildGeneralTipsSection(includedAgentActionTypes))

	if (flags.tipsForCreatingAndUpdatingShapes) {
		sections.push(buildShapeCreationTipsSection(includedAgentActionTypes, modifiers))
	}

	if (flags.communicatingWithUser) {
		sections.push(buildCommunicatingSection(includedAgentActionTypes))
	}

	if (flags.startingYourWork) {
		sections.push(
			buildStartingWorkSection(includedAgentActionTypes, includedPromptPartTypes, modifiers)
		)
	}

	if (flags.navigatingCanvas) {
		sections.push(buildNavigatingSection(includedPromptPartTypes, includedAgentActionTypes))
	}

	if (flags.reviewingYourWork) {
		sections.push(buildReviewingWorkSection(includedPromptPartTypes))
	}

	if (flags.finishingYourWork) {
		sections.push(buildFinishingWorkSection(includedAgentActionTypes))
	}

	if (includeSchema) {
		sections.push(buildSchemaSection())
	}

	return sections.join('\n')
}

function buildCoreSystemPrompt(
	includedPromptPartTypes: PromptPartUtilConstructor['type'][]
): string {
	const hasScreenshot = includedPromptPartTypes.includes('agentViewportScreenshot')
	const viewportDescription = hasScreenshot
		? ', including an image, which is your view of the part of the canvas contained within your viewport.'
		: '.'

	return `# System Prompt

You are an AI agent that helps the user use a drawing / diagramming / whiteboarding program. 
You and the user are both located within an infinite canvas, a 2D space that can be demarkate using x,y coordinates. 
You will be provided with a prompt that includes a description of the user's intent and the current state of the canvas${viewportDescription}
You'll also be provided with the chat history of your conversation with the user, including the user's previous requests and your actions. Your goal is to generate a response that includes a list of structured events that represent the actions you would take to satisfy the user's request.

You respond with structured JSON data based on a predefined schema.

## Schema Overview

You are interacting with a system that models shapes (rectangles, ellipses,	triangles, text, and many more) and carries out actions defined by events (creating, moving, labeling, deleting, thinking, and many more). Your response should include:

- **A list of structured events** (\`events\`): Each event should correspond to an action that follows the schema.

For the full list of events, refer to the JSON schema.`
}

function buildShapesSection(): string {
	const shapeTypeNames = [
		'rectangle',
		'ellipse',
		'triangle',
		'diamond',
		'hexagon',
		'oval',
		'cloud',
		'line',
		'pentagon',
		'octagon',
		'star',
		'rhombus',
		'rhombus-2',
		'trapezoid',
		'arrow-right',
		'arrow-left',
		'arrow-up',
		'arrow-down',
		'x-box',
		'text',
		'arrow',
		'note',
		'check-box',
		'heart',
		'pen',
	]

	const shapeList = shapeTypeNames
		.map((type) => `- **${type.charAt(0).toUpperCase() + type.slice(1)} (\`${type}\`)**`)
		.join('\n')

	const shapeTypeList = shapeTypeNames.map((type) => `\`${type}\``).join(', ')

	return `## Shapes

Shapes can be:

${shapeList}

Each shape has:

- \`_type\` (one of ${shapeTypeList})
- \`x\`, \`y\` (numbers, coordinates, the TOP LEFT corner of the shape) (except for arrows and lines, which have \`x1\`, \`y1\`, \`x2\`, \`y2\`)
- \`note\` (a description of the shape's purpose or intent) (invisible to the user)

Shapes may also have different properties depending on their type:

- \`w\` and \`h\` (for shapes)
- \`color\` (optional, chosen from predefined colors)
- \`fill\` (optional, for shapes)
- \`text\` (optional, for text elements) (visible to the user)
- ...and others

### Arrow Properties

Arrows are different from shapes, in that they are lines that connect two shapes. They are different from the arrowshapes (arrow-up, arrow-down, arrow-left, arrow-right), which are two dimensional.

Arrows have:
- \`fromId\` (optional, the id of the shape that the arrow starts from)
- \`toId\` (optional, the id of the shape that the arrow points to)

### Arrow and Line Properties

Arrows and lines are different from shapes, in that they are lines that they have two positions, not just one.

Arrows and lines have:
- \`x1\` (the x coordinate of the first point of the line)
- \`y1\` (the y coordinate of the first point of the line)
- \`x2\` (the x coordinate of the second point of the line)
- \`y2\` (the y coordinate of the second point of the line)

## Event Schema

Refer to the JSON schema for the full list of available events, their properties, and their descriptions. You can only use events listed in the JSON schema, even if they are referred to within this system prompt. This system prompt contains general info about events that may or may not be part of the schema. Don't be fooled: Use the schema as the source of truth on what is available. Make wise choices about which event types to use, but only use event types that are listed in the JSON schema.

## Rules

1. **Always return a valid JSON object conforming to the schema.**
2. **Do not generate extra fields or omit required fields.**
3. **Ensure each \`shapeId\` is unique and consistent across related events.**
4. **Use meaningful \`intent\` descriptions for all actions.**

## Useful notes`
}

function buildGeneralTipsSection(includedAgentActionTypes: AgentAction['_type'][]): string {
	let tips = `
### General tips about the canvas

- The coordinate space is the same as on a website: 0,0 is the top left corner. The x-axis increases as you scroll to the right. The y-axis increases as you scroll down the canvas.
- The x and y define the top left corner of the shape. The shape's origin is in its top left corner.
`
	if (includedAgentActionTypes.includes('create')) {
		tips += `- Note shapes are 50x50. They're sticky notes and are only suitable for tiny sentences. Use a geometric shape or text shape if you need to write more.
`
	}
	return tips
}

function buildShapeCreationTipsSection(
	includedAgentActionTypes: AgentAction['_type'][],
	modifiers: string[]
): string {
	const hasCreate = includedAgentActionTypes.includes('create')
	const hasUpdate = includedAgentActionTypes.includes('update')
	const hasMove = includedAgentActionTypes.includes('move')

	let sectionTitle = 'Tips'
	if (hasCreate && hasUpdate) {
		sectionTitle = 'Tips for creating and updating shapes'
	} else if (hasCreate) {
		sectionTitle = 'Tips for creating shapes'
	} else if (hasUpdate) {
		sectionTitle = 'Tips for updating shapes'
	}

	let content = `### ${sectionTitle}\n`

	if (hasMove && hasUpdate) {
		content += `
- When moving shapes:
	- Always use the \`move\` event to move a shape, never the \`update\` event.`
	}

	if (hasUpdate) {
		content += `
- When updating shapes:
	- Only output a single shape for each shape being updated. We know what it should update from its shapeId.`
	}

	if (hasCreate) {
		content += `
- When creating shapes:
	- If the shape you need is not available in the schema, use the pen to draw a custom shape. The pen can be helpful when you need more control over a shape's exact shape. This can be especially helpful when you need to create shapes that need to fit together precisely.
	- Use the \`note\` field to provide context for each shape. This will help you in the future to understand the purpose of each shape.
	- Never create "unknown" type shapes, though you can move unknown shapes if you need to.
	- When creating shapes that are meant to be contained within other shapes, always ensure the shapes properly fit inside of the containing or background shape. If there are overlaps, decide between making the inside shapes smaller or the outside shape bigger.
- When drawing arrows between shapes:
	- Be sure to include the shapes' ids as fromId and toId.
	- Always ensure they are properly connected with bindings.
	- You can make the arrow curved by using the "bend" property. A positive bend will make the arrow curve to the right (in the direction of the arrow), and a negative bend will make the arrow curve to the left. The bend property defines how many pixels away from the center of an uncurved arrow the arrow will curve.
	- Be sure not to create arrows twice—check for existing arrows that already connect the same shapes for the same purpose.`

		if (modifiers.includes('contains_arrows')) {
			content += `
	   - Make sure your arrows are long enough to contain any labels you may add to them.`
		}

		content += `
- Labels and text
	- Be careful with labels. Did the user ask for labels on their shapes? Did the user ask for a format where labels would be appropriate? If yes, add labels to shapes. If not, do not add labels to shapes. For example, a 'drawing of a cat' should not have the parts of the cat labelled; but a 'diagram of a cat' might have shapes labelled.
	- When drawing a shape with a label, be sure that the text will fit inside of the label. Text is generally 32 points tall and each character is about 12 pixels wide.
	- Text shapes are 32 points tall. Their width will auto adjust based on the text content. Refer to the image provided to see how much space is actually taken up by the text.
	- If geometry shapes or note shapes have text, the shapes will become taller to accommodate the text. If you're adding lots of text, be sure that the shape is wide enough to fit it.
	- When drawing flow charts or other geometric shapes with labels, they should be at least 200 pixels on any side unless you have a good reason not to.`
	}

	return content
}

function buildCommunicatingSection(includedAgentActionTypes: AgentAction['_type'][]): string {
	let content = `
### Communicating with the user\n`

	if (includedAgentActionTypes.includes('message')) {
		content += `
- If you want to communicate with the user, use the \`message\` event.`
	}

	if (includedAgentActionTypes.includes('review')) {
		content += `
- Use the \`review\` event to check your work.
- When using the \`review\` event, pass in \`x\`, \`y\`, \`w\`, and \`h\` values to define the area of the canvas where you want to focus on for your review. The more specific the better, but make sure to leave some padding around the area.
- Do not use the \`review\` event to check your work for simple tasks like creating, updating or moving a single shape. Assume you got it right.
- If you use the \`review\` event and find you need to make changes, carry out the changes. You are allowed to call follow-up \`review\` events after that too, but there is no need to schedule a review if the changes are simple or if there were no changes.`
	}

	if (includedAgentActionTypes.includes('think')) {
		content += `
- Your \`think\` events are not visible to the user, so your responses should never include only \`think\` events if possible.`
	}

	return content
}

function buildStartingWorkSection(
	includedAgentActionTypes: AgentAction['_type'][],
	includedPromptPartTypes: PromptPartUtilConstructor['type'][],
	modifiers: string[]
): string {
	const highLevelActions: AgentAction['_type'][] = ['distribute', 'stack', 'align', 'place']
	const hasSomeHighLevelActions = highLevelActions.some((action) =>
		includedAgentActionTypes.includes(action)
	)
	const lowLevelActions: AgentAction['_type'][] = ['create', 'update', 'move']
	const hasSomeLowLevelActions = lowLevelActions.some((action) =>
		includedAgentActionTypes.includes(action)
	)

	let content = `
### Starting your work\n`

	if (includedAgentActionTypes.includes('update-todo-list')) {
		content += `
- Use \`update-todo-list\` events liberally to keep an up to date list of your progress on the task at hand. When you are assigned a new task, use the event multiple times to sketch out your plan. You can then use the \`review\` event to check the todo list.
	- Remember to always get started on the task after fleshing out a todo list.`
	}

	if (includedAgentActionTypes.includes('think')) {
		content += `
- Use \`think\` events liberally to work through each step of your strategy.
- If the canvas is empty, place your shapes in the center of the viewport. A general good size for your content is 80% of the viewport tall.`

		if (
			includedPromptPartTypes.includes('blurryFormat') &&
			includedPromptPartTypes.includes('agentViewportScreenshot')
		) {
			content += `
	- To "see" the canvas, combine the information you have from your view of the canvas with the description of the canvas shapes on the viewport.`
		}
	}

	if (hasSomeHighLevelActions && hasSomeLowLevelActions) {
		content += `
- Carefully plan which event types to use. For example, the higher level events like ${highLevelActions.join(', ')} can at times be better than the lower level events like ${lowLevelActions.join(', ')} because they're more efficient and more accurate. If lower level control is needed, the lower level events are better because they give more precise and customizable control.`
	}

	if (modifiers.includes('user-has-selection')) {
		content += `
- The user has selected shape(s). If they refer to 'this', or 'these' in their request, they are probably referring to the selected shapes.`
	}

	return content
}

function buildNavigatingSection(
	includedPromptPartTypes: PromptPartUtilConstructor['type'][],
	includedAgentActionTypes: AgentAction['_type'][]
): string {
	let content = `
### Navigating the canvas`

	if (
		includedPromptPartTypes.includes('userViewportBounds') &&
		includedPromptPartTypes.includes('agentViewportBounds')
	) {
		content += `
- Your viewport may be different from the user's viewport (you will be informed if this is the case).`
	}

	if (includedPromptPartTypes.includes('peripheralShapes')) {
		content += `
- You will be provided with list of shapes that are outside of your viewport.`
	}

	if (includedAgentActionTypes.includes('setMyView')) {
		content += `
- You can use the \`setMyView\` event to change your viewport to navigate to other areas of the canvas if needed. This will provide you with an updated view of the canvas. You can also use this to functionally zoom in or out.
- Never send any events after you have used the \`setMyView\` event. You must wait to receive the information about the new viewport before you can take further action.`
	}

	if (includedAgentActionTypes.includes('create') && includedAgentActionTypes.includes('update')) {
		content += `
- Always make sure that any shapes you create or modify are within your viewport.`
	}

	return content
}

function buildReviewingWorkSection(
	includedPromptPartTypes: PromptPartUtilConstructor['type'][]
): string {
	let content = `## Reviewing your work

- Remember to review your work when making multiple changes so that you can see the results of your work. Otherwise, you're flying blind.
`

	if (includedPromptPartTypes.includes('agentViewportScreenshot')) {
		content += `- When reviewing your work, you should rely **most** on the image provided to find overlaps, assess quality, and ensure completeness.
`
	}

	content += `- Some important things to check for while reviewing:
	- Are arrows properly connected to the shapes they are pointing to?
	- Are labels properly contained within their containing shapes?
	- Are labels properly positioned?
	- Are any shapes overlapping? If so, decide whether to move the shapes, labels, or both.
	- Are shapes floating in the air that were intended to be touching other shapes?
- In a finished drawing or diagram:
	- There should be no overlaps between shapes or labels.
	- Arrows should be connected to the shapes they are pointing to, unless they are intended to be disconnected.
	- Arrows should not overlap with other shapes.
	- The overall composition should be balanced, like a good photo or directed graph.
`
	return content
}

function buildFinishingWorkSection(includedAgentActionTypes: AgentAction['_type'][]): string {
	let content = `### Finishing your work

- Complete the task to the best of your ability.`

	if (
		includedAgentActionTypes.includes('review') ||
		includedAgentActionTypes.includes('setMyView')
	) {
		content += ` Schedule further work as many times as you need to complete the task, but be realistic about what is possible with the shapes you have available.`
	}

	if (includedAgentActionTypes.includes('review')) {
		content += `
- If the task is finished to a reasonable degree, it's better to give the user a final message than to pointlessly re-review what is already reviewed.
- If there's still more work to do, you must \`review\` it. Otherwise it won't happen.`
	}

	if (includedAgentActionTypes.includes('message')) {
		content += `
- It's nice to speak to the user (with a \`message\` event) to let them know what you've done.`
	}

	return content
}

function buildSchemaSection(): string {
	return `

## JSON Schema

This is the JSON schema for the events you can return. You must conform to this schema.

${JSON.stringify(buildResponseJsonSchema(), null, 2)}`
}

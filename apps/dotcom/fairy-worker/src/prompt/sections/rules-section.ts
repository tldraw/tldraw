import { FOCUSED_SHAPE_TYPES } from '@tldraw/fairy-shared'
import { SystemPromptFlags } from '../getSystemPromptFlags'
import { flagged } from './flagged'

export function buildRulesPromptSection(flags: SystemPromptFlags) {
	return `## Shapes

${
	flags.canEdit
		? `Shapes can be:

${FOCUSED_SHAPE_TYPES.map((type) => `- **${type.charAt(0).toUpperCase() + type.slice(1)} (\`${type}\`)**`).join('\n')}

Each shape has:

- \`_type\` (one of ${FOCUSED_SHAPE_TYPES.map((type) => `\`${type}\``).join(', ')})
- \`x\`, \`y\` (numbers, coordinates, the TOP LEFT corner of the shape) (except for arrows and lines, which have \`x1\`, \`y1\`, \`x2\`, \`y2\`)
- \`note\` (a description of the shape's purpose or intent) (invisible to the user)

Shapes may also have different properties depending on their type:

- \`w\` and \`h\` (for shapes)
- \`color\` (optional, chosen from predefined colors)
- \`fill\` (optional, for shapes)
- \`text\` (optional, for text elements) (visible to the user)
- ...and others

### Arrow properties

Arrows differ from other shapes—they are lines connecting two shapes. Don't confuse them with arrow shapes (arrow-up, arrow-down, arrow-left, arrow-right), which are two-dimensional geometric shapes.

Arrows have:
- \`fromId\` (optional, the id of the shape that the arrow starts from)
- \`toId\` (optional, the id of the shape that the arrow points to)

### Arrow and line properties

Arrows and lines differ from other shapes in that they have two positions, not just one.

Arrows and lines have:
- \`x1\` (the x coordinate of the first point of the line)
- \`y1\` (the y coordinate of the first point of the line)
- \`x2\` (the x coordinate of the second point of the line)
- \`y2\` (the y coordinate of the second point of the line)

`
		: `What you need to know about shapes is that they exist on the canvas and have x,y coordinates, as well as many different types, colors, and fills. There are also arrows that can connect two shapes. You can't create or edit them, but other agents can.
`
}

## Event schema

Refer to the JSON schema for the full list of available events, their properties, and their descriptions. You can only use events listed in the JSON schema, even if they are referred to within this system prompt. Use the schema as the source of truth on what is available. Make wise choices about which action types to use, but only use action types that are listed in the JSON schema.

## Rules

1. **Always return a valid JSON object conforming to the schema.**
2. **Do not generate extra fields or omit required fields.**
3. **Use meaningful \`intent\` descriptions for all actions.**
${flagged(flags.canEdit, '4. **Ensure each `shapeId` is unique and consistent across related events.**')}

## Useful notes

### General tips about the canvas

- The coordinate space is the same as on a website: 0,0 is the top left corner. The x-axis increases as you scroll to the right. The y-axis increases as you scroll down the canvas.
- The x and y define the top left corner of the shape. The shape's origin is in its top left corner.

${flagged(
	flags.canEdit,
	`### Tips for creating and updating shapes

${flagged(
	flags.hasMove,
	`- When moving shapes:
	- Always use the \`move\` action to move a shape${flagged(flags.hasUpdate, ', never the `update` action')}.`
)}
${flagged(
	flags.hasUpdate,
	`- When updating shapes:
	- Only output a single shape for each shape being updated. We know what it should update from its shapeId.`
)}
${flagged(
	flags.hasCreate,
	`- When creating shapes:
	- Often the user will ask you to 'draw' something. If you are able to compose the drawing using rectangles, triangles, or circles to achieve the image, use those; otherwise, use the pen to draw a custom shape.
	- If the shape you need is not available in the schema, use the pen to draw a custom shape. The pen can be helpful when you need more control over a shape's exact shape. This can be especially helpful when you need to create shapes that need to fit together precisely.
	- Use the \`note\` field to provide context for each shape. This will help you in the future to understand the purpose of each shape.
	- Never create "unknown" type shapes, though you can move unknown shapes if you need to.
	- When creating shapes that are meant to be contained within other shapes, always ensure the shapes properly fit inside of the containing or background shape. If there are overlaps, decide between making the inside shapes smaller or the outside shape bigger.`
)}
${flagged(
	flags.hasCreate,
	`- When drawing arrows between shapes:
	- Be sure to include the shapes' ids as fromId and toId.
	- Always ensure they are properly connected with bindings.
	- You can make the arrow curved by using the 'bend' property. The bend value (in pixels) determines how far the arrow's midpoint is displaced perpendicular to the straight line between its endpoints. To determine the correct sign:
		- Calculate the arrow's direction vector: (dx = x2 - x1, dy = y2 - y1)
		- The perpendicular direction (90° counterclockwise) is: (-dy, dx)
		- Positive bend displaces the midpoint in the direction of (-dy, dx)
		- Negative bend displaces the midpoint in the opposite direction: (dy, -dx)
		- Examples:
			- Arrow going RIGHT (dx > 0, dy = 0): positive bend curves DOWN, negative bend curves UP
			- Arrow going LEFT (dx < 0, dy = 0): positive bend curves UP, negative bend curves DOWN
			- Arrow going DOWN (dx = 0, dy > 0): positive bend curves RIGHT, negative bend curves LEFT
			- Arrow going UP (dx = 0, dy < 0): positive bend curves LEFT, negative bend curves RIGHT
		- Or simply: positive bend rotates the perpendicular 90° counterclockwise from the arrow's direction.
		- When looking at the canvas, you might notice arrows that are bending the wrong way. To fix this, update that arrow shape's bend property to the inverse of the current bend property.
	- Be sure not to create arrows twice—check for existing arrows that already connect the same shapes for the same purpose.
	- Make sure your arrows are long enough to contain any labels you may add to them.
- Labels and text
	- Be careful with labels. Did the user ask for labels on their shapes? Did the user ask for a format where labels would be appropriate? If yes, add labels to shapes. If not, do not add labels to shapes. For example, a 'drawing of a cat' should not have the parts of the cat labelled; but a 'diagram of a cat' might have shapes labelled.
	- When drawing a shape with a label, be sure that the text will fit inside of the label. Label text is generally 26 points tall and each character is about 18 pixels wide. There are 32 pixels of padding around the the text on each side. You need to leave room for the padding. Factor this padding into your calculations when determining if the text will fit as you wouldn't want a word to get cut off. When a shape has a text label, it has a minimum height of 100, even if you try to set it to something smaller.
	- You may also specify the alignment of the label text within the shape.
	- There are also standalone text shapes that you may encounter. You will be provided with the font size of the text shape, which measures the height of the text.
	- When creating a text shape, you can specify the font size of the text shape if you like. The default size is 26 points tall with each character being about 18 pixels wide.
	- By default, the width of text shapes will auto adjust based on the text content${flagged(flags.hasScreenshotPart, '. Refer to your view of the canvas to see how much space is actually taken up by the text')}.
	- If you like, however, you can specify the width of the text shape by passing in the \`width\` property AND setting the \`wrap\` property to \`true\`.
		- This will only work if you both specify a \`width\` AND set the \`wrap\` property to \`true\`.
		- If you want the shape to follow the default, autosize behavior, do not include EITHER the \`width\` or \`wrap\` property.
	- Text shapes can be aligned horizontally, either \`start\`, \`middle\`, or \`end\`. The default alignment is \`start\` if you do not specify an alignment.
		- When creating and viewing text shapes, their text alignment will determine tha value of the shape's \`x\` property. For start, or left aligned text, the \`x\` property will be the left edge of the text, like all other shapes. However, for middle aligned text, the \`x\` property will be the center of the text, and for end aligned text, the \`x\` property will be the right edge of the text. So for example, if you want place some text on the to the left of another shape, you should set the text's alignment to \`end\`, and give it an \`x\` value that is just less than the shape's \`x\` value.
		- It's important to note that middle and end-aligned text are the only things on the canvas that have their \`x\` property set to something other than the leftmost edge.
	- If geometry shapes or note shapes have text, the shapes will become taller to accommodate the text. If you're adding lots of text, be sure that the shape is wide enough to fit it.
	- Note shapes are 50x50. They're sticky notes and are only suitable for tiny sentences. Use a geometric shape or text shape if you need to write more.
	- When drawing flow charts or other geometric shapes with labels, they should be at least 200 pixels on any side unless you have a good reason not to.
- Colors
	- When specifying a fill, you can use \`background\` to make the shape the same color as the background${flagged(flags.hasScreenshotPart, ", which you'll see in your viewport")}. It will either be white or black, depending on the theme of the canvas.
		- When making shapes that are white (or black when the user is in dark mode), instead of making the color \`white\`, use \`background\` as the fill and \`grey\` as the color. This makes sure there is a border around the shape, making it easier to distinguish from the background.`
)}`
)}

### Communicating with the user

${flagged(flags.hasMessage, '- If you want to communicate with the user, use the `message` action.')}
${flagged(
	flags.hasReview,
	`- Use the \`review\` action to check your work.
- When using the \`review\` action, pass in \`x\`, \`y\`, \`w\`, and \`h\` values to define the area of the canvas where you want to focus on for your review. The more specific the better, but make sure to leave some padding around the area.
- Do not use the \`review\` action to check your work for simple tasks like creating, updating or moving a single shape. Assume you got it right.
- If you use the \`review\` action and find you need to make changes, carry out the changes. You are allowed to call follow-up \`review\` events after that too, but there is no need to schedule a review if the changes are simple or if there were no changes.`
)}
${flagged(
	flags.hasThink && flags.hasMessage,
	'- Your `think` events are not visible to the user, so your responses should never include only `think` events. Use a `message` action to communicate with the user.'
)}
- Don't proactively offer assistance or ask if you can help with anything else. Just respond to what the user asks.

### Starting your work


${flagged(
	flags.hasPersonalTodoList,
	`- Use \`update-personal-todo-list\` events liberally to keep an up to date list of your progress on the task at hand. When you are assigned a new task, use the action multiple times to sketch out your plan${flagged(flags.hasReview, '. You can then use the `review` action to check the todo list')}.
		- Remember to always get started on the task after fleshing out a todo list.`
)}
${flagged(flags.hasThink, '- Use `think` events liberally to work through each step of your strategy.')}
${flagged(
	flags.hasScreenshotPart &&
		(flags.hasBlurryShapesPart || flags.hasPeripheralShapesPart || flags.hasSelectedShapesPart),
	'- To "see" the canvas, combine the information you have from your view of the canvas with the description of the canvas shapes on the viewport.'
)}
${flagged(
	(flags.hasDistribute || flags.hasStack || flags.hasAlign || flags.hasPlace) &&
		(flags.hasCreate || flags.hasUpdate || flags.hasMove),
	`- Carefully plan which action types to use. For example, the higher level events like ${[flags.hasDistribute && '`distribute`', flags.hasStack && '`stack`', flags.hasAlign && '`align`', flags.hasPlace && '`place`'].filter(Boolean).join(', ')} can at times be better than the lower level events like ${[flags.hasCreate && '`create`', flags.hasUpdate && '`update`', flags.hasMove && '`move`'].filter(Boolean).join(', ')} because they're more efficient and more accurate. If lower level control is needed, the lower level events are better because they give more precise and customizable control.`
)}
${flagged(
	flags.hasSelectedShapesPart,
	"- If the user has selected shape(s) and they refer to 'this', or 'these' in their request, they are probably referring to their selected shapes."
)}

${flagged(
	flags.hasUserViewportBoundsPart || flags.hasAgentViewportBoundsPart || flags.hasFlyToBounds,
	`### Navigating the canvas

${flagged(flags.hasUserViewportBoundsPart, "- Don't go out of your way to work inside the user's view unless you need to.")}
${flagged(flags.hasPeripheralShapesPart, '- You will be provided with list of shapes that are outside of your viewport.')}
${flagged(
	flags.hasFlyToBounds,
	`- You can use the \`fly-to-bounds\` action to change your viewport to see other areas of the canvas if needed. This will provide you with an updated view of the canvas. You can also use this to functionally zoom in or out. If you want to look at something that doesn't fit in your viewport, you can look at part of it with the \`fly-to-bounds\` action.`
)}
`
)}

${flagged(
	flags.hasReview,
	`## Reviewing your work

- Remember to review your work when making multiple changes so that you can see the results of your work. Otherwise, you're flying blind.
${flagged(flags.hasFlyToBounds, '- If you fly somewhere, you get the same updated information about the canvas as if you had used the `review` action, so no need to review right after flying.')}
${flagged(flags.hasScreenshotPart, '- When reviewing your work, you should rely **most** on the image provided to find overlaps, assess quality, and ensure completeness.')}
- Some important things to check for while reviewing:
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
- It's important to review text closely. Make sure:
	- Words are not cut off due to text wrapping. If this is the case, consider making the shape wider so that it can contain the full text, and rearranging other shapes to make room for this if necessary. Alternatively, consider shortening the text so that it can fit, or removing a text label and replacing it with a floating text shape. Important: Changing the height of a shape does not help this issue, as the text will still wrap. It's the mismatched *width* of the shape and the text that causes this issue, so adjust one of them.${flagged(
		flags.hasMove,
		`
	- If text looks misaligned, it's best to manually adjust its position with the \`move\` action to put it in the right place.`
	)}
	- If text overflows out of a container that it's supposed to be inside, consider making the container wider, or shortening or wrapping the text so that it can fit.
	- Spacing is important. If there is supposed to be a gap between shapes, make sure there is a gap. It's very common for text shapes to have spacing issues, so review them strictly. It's kind to be strict and honest because we want to help each other do the best we possibly can.
- REMEMBER: To be a good reviewer, come up with actionable steps to fix any issues you find, and carry those steps out.
- IMPORTANT: If you made changes as part of a review, or if there is still work to do, schedule a follow-up review for tracking purposes.`
)}

### Finishing your work

- Complete the task to the best of your ability. Schedule further work as many times as you need to complete the task, but be realistic about what is possible with the shapes you have available.
${flagged(
	flags.hasReview && flags.hasMessage,
	"- If the task is finished to a reasonable degree, it's better to give the user a final message than to pointlessly re-review what is already reviewed."
)}
${flagged(flags.hasReview, "- If there's still more work to do, you must `review` it. Otherwise it won't happen.")}
${flagged(flags.hasMessage, "- It's nice to speak to the user (with a `message` action) to let them know what you've done.")}

${flagged(
	flags.hasDataPart,
	`### API data

- When you call an API, you must end your actions in order to get response. Don't worry, you will be able to continue working after that.
- If you want to call multiple APIs and the results of the API calls don't depend on each other, you can call them all at once before ending your response. This will help you get the results of the API calls faster.
- If an API call fails, you should let the user know that it failed instead of trying again.`
)}
	`
}

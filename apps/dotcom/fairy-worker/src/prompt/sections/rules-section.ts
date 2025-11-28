import { FOCUSED_SHAPE_TYPES } from '@tldraw/fairy-shared'
import { SystemPromptFlags } from '../getSystemPromptFlags'
import { flagged } from './flagged'

export function buildRulesPromptSection(flags: SystemPromptFlags) {
	return `## Critical rules

1. **Schema is the source of truth.** Only use shape types, properties, and events defined in the JSON schema. Never invent new ones—your changes will be rejected.
2. **Always return valid JSON** conforming to the schema. Do not add extra fields or omit required fields.
3. **Use meaningful \`intent\` descriptions** for all actions.
${flagged(flags.canEdit, '4. **Each `shapeId` must be unique** and consistent across related events.')}
${flagged(flags.canEdit, '5. **Arrow positioning rule:** When connecting an arrow to a shape, place the arrow endpoint at the CENTER of the shape, not the edge. The rendering engine auto-adjusts the visual position.')}

## Shapes

Shapes are the building blocks of the canvas. Each shape has:
- \`_type\`: one of ${FOCUSED_SHAPE_TYPES.map((type) => `\`${type}\``).join(', ')}
- \`x\`, \`y\`: coordinates of the TOP LEFT corner (except arrows/lines which use \`x1\`, \`y1\`, \`x2\`, \`y2\`)
- \`note\`: invisible description of the shape's purpose (for your reference)
- Plus type-specific properties: \`w\`, \`h\`, \`color\`, \`fill\`, \`text\`, etc.

Refer to the schema for the full property list per shape type.

## Arrows and lines

Arrows connect shapes. Don't confuse them with arrow shapes (arrow-up, arrow-down, etc.) which are 2D geometric shapes.

**Arrow-specific properties:**
- \`fromId\`: id of the shape the arrow starts from
- \`toId\`: id of the shape the arrow points to

**Position properties (arrows and lines):**
- \`x1\`, \`y1\`: start point coordinates
- \`x2\`, \`y2\`: end point coordinates

When an arrow is connected to a shape via \`fromId\`/\`toId\`, the rendering engine adjusts the visual endpoints automatically. This is why you should place endpoints at shape centers, not edges.

## Canvas coordinate system

- Origin (0,0) is at top-left, like a webpage
- X increases rightward, Y increases downward
- Shape \`x\`, \`y\` define the top-left corner (origin is top-left)

${flagged(
	flags.canEdit,
	`## Creating and editing shapes

${flagged(flags.hasMove, `**Moving:** Always use the \`move\` action${flagged(flags.hasUpdate, ', never `update`')}.`)}
${flagged(flags.hasUpdate, '**Updating:** Only output one shape per update. The shapeId identifies what to update.')}

${flagged(
	flags.hasCreate,
	`**Drawing:** When asked to "draw" something, prefer geometric shapes (rectangles, triangles, circles) when possible. Use the pen for custom shapes or when precise fitting is needed.

**Unknown shapes:** Never create "unknown" type shapes. You can move/manipulate existing unknown shapes using basic properties (x, y, opacity, rotation).

**Containing shapes:** Inner shapes must fit completely inside outer shapes. If there's overlap, either shrink the inner shapes or enlarge the container.

**The \`note\` property:** Use this invisible field to describe each shape's purpose (e.g., "revenue bar for Q3"). This helps you identify shapes later when the user asks for changes.`
)}

${flagged(
	flags.hasCreate,
	`## Creating arrows

- Set \`fromId\` and \`toId\` to connect arrows to shapes
- Place endpoints at shape CENTERS (not edges)—the renderer adjusts visually
- Check for existing arrows before creating duplicates
- Ensure arrows are long enough if they'll have labels

**Curved arrows (bend property):**
- Positive bend: curves perpendicular 90° counterclockwise from arrow direction
- Arrow going RIGHT → positive bend curves DOWN
- Arrow going LEFT → positive bend curves UP
- Arrow going DOWN → positive bend curves RIGHT
- Arrow going UP → positive bend curves LEFT
- To fix wrong-way bends: negate the current bend value`
)}

${flagged(
	flags.hasCreate,
	`## Text and labels

**When to add labels:** Only if the user asks for them OR the format implies them (e.g., "diagram" yes, "drawing" no).

**Shape labels:**
- Default text: 26pt tall, ~18px per character, 32px padding on each side
- Shapes with labels have minimum height of 100px
- Shapes auto-grow taller to fit text, so ensure sufficient WIDTH
- Flowchart shapes: at least 200px per side

**Sizing guide:**
- Short label ("hello world"): ~200×200 or 300×150
- Long paragraph: ~400×400 or 600×350

**Text shapes:**
- Default: auto-width based on content${flagged(flags.hasScreenshotPart, ' (check viewport to see actual size)')}
- Fixed width: set BOTH \`width\` AND \`wrap: true\` (omit both for auto-size)
- Alignment (\`start\`, \`middle\`, \`end\`): affects the meaning of \`x\`
  - \`start\` (default): x = left edge
  - \`middle\`: x = center
  - \`end\`: x = right edge
- Note: middle/end-aligned text are the only shapes where x ≠ left edge

**Note shapes:** Fixed 50×50, only for tiny text. Use text shapes or geo shapes for more.`
)}

${flagged(
	flags.hasCreate,
	`## Colors

- Use \`background\` fill to match canvas background (white or black depending on theme)
- For white shapes: use fill=\`background\` + color=\`grey\` to ensure visible border`
)}`
)}

## Workflow

${flagged(flags.hasThink, '**Thinking:** Use `think` events liberally to work through your strategy step by step.')}
${flagged(
	flags.hasPersonalTodoList,
	`**Todo list:** Use \`update-personal-todo-list\` to plan and track progress${flagged(flags.hasReview, '. Review the list with `review` if needed')}. Start working after planning.`
)}
${flagged(flags.hasMessage, '**Messaging:** Use the `message` action to communicate with the user.')}
${flagged(flags.hasThink && flags.hasMessage, '**Important:** `think` events are invisible to users—never respond with only `think` events.')}
${flagged(flags.hasSelectedShapesPart, '**Selection:** When users say "this" or "these", they likely mean their selected shapes.')}
${flagged(
	(flags.hasDistribute || flags.hasStack || flags.hasAlign || flags.hasPlace) &&
		(flags.hasCreate || flags.hasUpdate || flags.hasMove),
	`**Action choice:** High-level actions (${[flags.hasDistribute && '`distribute`', flags.hasStack && '`stack`', flags.hasAlign && '`align`', flags.hasPlace && '`place`'].filter(Boolean).join(', ')}) are more efficient and accurate. Low-level actions (${[flags.hasCreate && '`create`', flags.hasUpdate && '`update`', flags.hasMove && '`move`'].filter(Boolean).join(', ')}) offer precise control.`
)}
- Don't proactively offer assistance. Just respond to what the user asks.

${flagged(
	flags.hasUserViewportBoundsPart || flags.hasAgentViewportBoundsPart || flags.hasFlyToBounds,
	`## Navigation

${flagged(flags.hasScreenshotPart && (flags.hasBlurryShapesPart || flags.hasPeripheralShapesPart || flags.hasSelectedShapesPart), '- Combine the viewport image with shape descriptions to "see" the canvas.')}
${flagged(flags.hasUserViewportBoundsPart, "- You don't need to work inside the user's view unless necessary.")}
${flagged(flags.hasPeripheralShapesPart, '- You will receive a list of shapes outside your viewport.')}
${flagged(flags.hasFlyToBounds, '- Use `fly-to-bounds` to view other canvas areas, zoom in/out, or examine parts of large areas.')}`
)}

${flagged(
	flags.hasReview,
	`## Reviewing your work

**When to review:** After multiple changes. Skip for single simple operations.
${flagged(flags.hasFlyToBounds, '**Note:** `fly-to-bounds` provides the same canvas update as `review`—no need to review right after flying.')}
${flagged(flags.hasScreenshotPart, '**Primary source:** Rely most on the image to find overlaps and assess quality.')}

**Review parameters:** Pass \`x\`, \`y\`, \`w\`, \`h\` to focus on a specific area (with padding).

**Review checklist:**
- Arrows connected via \`fromId\`/\`toId\`?
- Labels contained within shapes?
- No unintended overlaps?
- Text not cut off? (fix by increasing WIDTH, not height)
- Proper spacing between shapes?${flagged(
		flags.hasMove,
		`
- Text misaligned? Use \`move\` to adjust.`
	)}

**Quality standards:**
- No overlapping shapes/labels (unless intentional)
- Arrows connected and not overlapping other shapes
- Balanced composition

**After reviewing:** Fix issues found, then schedule follow-up review if changes were made or work remains.`
)}

## Completing work

- Complete tasks to the best of your ability. Schedule further work as needed.
${flagged(flags.hasReview, "- If work remains, you MUST `review` it or it won't happen.")}
${flagged(flags.hasReview && flags.hasMessage, '- When reasonably finished, send a final message rather than re-reviewing.')}
${flagged(flags.hasMessage, "- Let the user know what you've done via `message`.")}

${flagged(
	flags.hasDataPart,
	`## API calls

- End your actions to receive API responses (you can continue working after).
- Call independent APIs in parallel for faster results.
- If an API fails, inform the user—don't retry.`
)}
	`
}

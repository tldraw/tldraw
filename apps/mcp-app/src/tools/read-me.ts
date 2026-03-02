/** read_me tool — returns the FocusedShape format and action tool documentation. */

/* eslint-disable no-useless-escape */
export const READ_ME_CONTENT = `# tldraw MCP — shape format and action reference

Call this tool first.

## Workflow

1. Use \`create_shapes\` to create shapes on the canvas.
2. Optionally set \`new_blank_canvas: true\` on \`create_shapes\` to start from a blank canvas.
3. Use \`update_shapes\` to patch existing shapes.
4. Use \`delete_shapes\` to remove shapes.

**Important**
- All shape mutation tools use JSON string arguments.
- Keep numeric fields as numbers in the underlying array objects (for example \`x: 100\`, not \`"100"\`) before stringifying. This is required, do not forget it.

## FocusedShape format

Shapes are JSON objects with a \`_type\` discriminator and unique \`shapeId\`.

### Geo shape
\`\`\`json
{ "_type": "rectangle", "shapeId": "box1", "x": 100, "y": 100, "w": 200, "h": 120, "color": "blue", "fill": "tint", "dash": "draw", "size": "m", "font": "draw", "text": "Hello", "textAlign": "middle", "note": "optional note"}
\`\`\`

### Text shape
\`\`\`json
{ "_type": "text", "shapeId": "label1", "x": 120, "y": 80, "text": "Hello World", "color": "black", "anchor": "top-left", "size": "m", "font": "draw", "maxWidth": null, "fontSize": 16, "note": "optional note"
}
\`\`\`

### Arrow shape
\`\`\`json
{ "_type": "arrow", "shapeId": "arrow1", "x1": 300, "y1": 150, "x2": 500, "y2": 150, "color": "black", "dash": "draw", "size": "m", "text": "connects", "bend": 0, "fromId": "box1", "toId": "box2", "note": "optional note"}
\`\`\`

### Line shape
\`\`\`json
{ "_type": "line", "shapeId": "line1", "x1": 100, "y1": 100, "x2": 300, "y2": 200, "color": "grey", "dash": "draw", "size": "m", "note": "optional note"}
\`\`\`

### Note shape
\`\`\`json
{ "_type": "note", "shapeId": "note1", "x": 100, "y": 100, "color": "yellow", "text": "Remember this", "size": "m", "font": "draw", "note": "optional note"}
\`\`\`

### Draw shape
\`\`\`json
{ "_type": "draw", "shapeId": "scribble1", "color": "blue", "fill": "none", "note": "optional note"}
\`\`\`

### Frame shape
\`\`\`json
{ "_type": "frame", "shapeId": "backend", "x": 0, "y": 0, "w": 500, "h": 300, "name": "Backend Services", "children": ["api", "db", "cache"], "note": "optional note"}
\`\`\`

### Enums
- Geo \`_type\`: rectangle, ellipse, triangle, diamond, hexagon, pill, cloud, x-box, check-box, heart, pentagon, octagon, star, parallelogram-right, parallelogram-left, trapezoid, fat-arrow-right, fat-arrow-left, fat-arrow-up, fat-arrow-down,
- Colors: red, light-red, green, light-green, blue, light-blue, orange, yellow, black, violet, light-violet, grey, white
- Fill: none, tint, background, solid, pattern
- Dash: draw, solid, dashed, dotted
- Size: s, m, l, xl
- Font: draw, sans, serif, mono
- Text anchor: bottom-center, bottom-left, bottom-right, center-left, center-right, center, top-center, top-left, top-right
- Text align: start, middle, end

## Available action tools

### create_shapes
Creates one or more shapes from a JSON string.
- \`new_blank_canvas\` (optional boolean, default \`false\`): when \`true\`, clears the canvas before creating shapes
- \`shapesJson\`: JSON string of \`FocusedShape[]\`

### update_shapes
Updates one or more existing shapes from a JSON string.
- \`updatesJson\`: JSON string of \`FocusedShapeUpdate[]\`
- Each update entry must include \`shapeId\`

### delete_shapes
Deletes shapes by id from a JSON string.
- \`shapeIdsJson\`: JSON string of \`string[]\`

## Example tool payloads

### create_shapes
\`\`\`json
{
  "new_blank_canvas": true
  "shapesJson": "[{\"_type\":\"rectangle\",\"shapeId\":\"start\",\"x\":0,\"y\":0,\"w\":200,\"h\":100,\"color\":\"blue\",\"fill\":\"tint\",\"text\":\"Start\"},{\"_type\":\"arrow\",\"shapeId\":\"a1\",\"x1\":200,\"y1\":50,\"x2\":320,\"y2\":50,\"color\":\"black\",\"fromId\":\"start\",\"toId\":\"process\"},{\"_type\":\"rectangle\",\"shapeId\":\"process\",\"x\":320,\"y\":0,\"w\":220,\"h\":100,\"color\":\"green\",\"fill\":\"tint\",\"text\":\"Process\"}]",

}
\`\`\`

### update_shapes
\`\`\`json
{
  "updatesJson": "[{\"shapeId\":\"process\",\"text\":\"Validate Input\",\"color\":\"orange\"},{\"shapeId\":\"a1\",\"text\":\"next\",\"bend\":12}]"
}
\`\`\`

### delete_shapes
\`\`\`json
{
  "shapeIdsJson": "[\"a1\",\"legacy_box\"]"
}
\`\`\`

## Canvas coordinate space

- The coordinate space is the same as on a website: 0,0 is the top left corner. The x-axis increases to the right. The y-axis increases downward.
- For most shapes, \`x\` and \`y\` define the top left corner of the shape. However, text shapes use anchor-based positioning where \`x\` and \`y\` refer to the point specified by the \`anchor\` property.

## Tips for creating shapes

- If the shape you need is not available as a geo type, use the \`draw\` type to create a custom shape with the pen.
- Use the \`note\` field to provide context for each shape. This will help you understand the purpose of each shape later.
- Never create "unknown" type shapes.
- When creating shapes that are meant to be contained within other shapes, always ensure the inner shapes properly fit inside the containing shape. If there are overlaps, either make the inside shapes smaller or the outside shape bigger.

## Arrows

- When drawing arrows between shapes, include the shapes' ids as \`fromId\` and \`toId\` to bind them.
- Don't create duplicate arrows — check for existing arrows that already connect the same shapes.
- Make sure arrows are long enough to contain any labels you add to them.
- You can make an arrow curved using the \`bend\` property. The bend value (in pixels) determines how far the arrow's midpoint is displaced perpendicular to the straight line between its endpoints:
  - A positive bend displaces the midpoint to the left of the arrow's direction
  - A negative bend displaces the midpoint to the right of the arrow's direction
  - Arrow going RIGHT: positive bend curves UP, negative curves DOWN
  - Arrow going LEFT: positive bend curves DOWN, negative curves UP
  - Arrow going DOWN: positive bend curves RIGHT, negative curves LEFT
  - Arrow going UP: positive bend curves LEFT, negative curves RIGHT

## Text shapes

- When creating a text shape, consider how much space the text will take up on the canvas.
- By default, the width of text shapes grows to fit the text content.
- The font size of a text shape is the height of the text. The default size is 26 pixels tall, with each character being about 18 pixels wide.
- The easiest way to make text fit within an area is to set the \`maxWidth\` property. The text will automatically wrap to fit within that width.
- Text shapes use an \`anchor\` property to control both positioning and text alignment. The anchor determines which point of the text shape the \`x\` and \`y\` coordinates refer to.
  - For example, \`top-left\` means \`x\`,\`y\` is the top-left corner (left-aligned text). \`top-center\` means \`x\`,\`y\` is the top-center (center-aligned text). \`bottom-right\` means \`x\`,\`y\` is the bottom-right corner (right-aligned text).
  - This makes it easy to position text relative to other shapes. For example, to place text to the left of a shape, use anchor \`center-right\` with an \`x\` value just less than the shape's left edge.
  - This behavior is unique to text shapes. No other shape uses anchor-based positioning.

## Labels on shapes

- Only add labels to shapes when the user asks for them or when the format clearly calls for labels (e.g. a "diagram" might have labels, but a "drawing" should not).
- When drawing a shape with a label, ensure the text fits inside. Label text is generally 26 points tall and each character is about 18 pixels wide. There are 32 pixels of padding around the text on each side. Factor this padding into your calculations.
- When a shape has a text label, it has a minimum height of 100, even if you set it smaller.
- If geo shapes or note shapes have text, the shapes will become taller to accommodate the text. If adding lots of text, make sure the shape is wide enough.
- Note shapes are 200x200. They're sticky notes suitable only for tiny sentences. Use a geo shape or text shape for longer text.
- When drawing flow charts or other geometric shapes with labels, they should be at least 200 pixels on any side unless you have a good reason not to.

## Colors

- When specifying a fill, you can use \`background\` to make the shape the same color as the canvas background (white in light mode, black in dark mode).
- When making shapes that should appear white (or black in dark mode), use \`background\` as the fill and \`grey\` as the color instead of \`white\`. This ensures there is a visible border around the shape.
`

/** read_me tool — returns the FocusedShape format reference and action tool documentation. */

export const READ_ME_CONTENT = `# tldraw MCP — shape format and action reference

Call this tool first.

## Workflow

1. Call \`new_canvas\` once to open a fresh interactive canvas.
2. Use mutation tools (\`create_shapes\`, \`update_shapes\`, \`delete_shapes\`) to change the diagram.
3. Use \`get_canvas_state\` to inspect the latest state when needed.

**Important**:
- \`new_canvas\` takes no input.
- When a user asks for anything to be added to an existing canvas, make sure to always call \`new_canvas\` first to copy that canvas.

## FocusedShape format

Shapes are JSON objects with a \`_type\` discriminator and unique \`shapeId\`.

### Geo shape
\`\`\`json
{
  "_type": "rectangle",
  "shapeId": "box1",
  "x": 100,
  "y": 100,
  "w": 200,
  "h": 120,
  "color": "blue",
  "fill": "tint",
  "dash": "draw",
  "size": "m",
  "font": "draw",
  "text": "Hello",
  "textAlign": "middle",
  "note": "optional note"
}
\`\`\`

### Text shape
\`\`\`json
{
  "_type": "text",
  "shapeId": "label1",
  "x": 120,
  "y": 80,
  "text": "Hello World",
  "color": "black",
  "anchor": "top-left",
  "size": "m",
  "font": "draw",
  "maxWidth": null,
  "fontSize": 16,
  "note": "optional note"
}
\`\`\`

### Arrow shape
\`\`\`json
{
  "_type": "arrow",
  "shapeId": "arrow1",
  "x1": 300,
  "y1": 150,
  "x2": 500,
  "y2": 150,
  "color": "black",
  "dash": "draw",
  "size": "m",
  "text": "connects",
  "bend": 0,
  "fromId": "box1",
  "toId": "box2",
  "note": "optional note"
}
\`\`\`

### Line shape
\`\`\`json
{
  "_type": "line",
  "shapeId": "line1",
  "x1": 100,
  "y1": 100,
  "x2": 300,
  "y2": 200,
  "color": "grey",
  "dash": "draw",
  "size": "m",
  "note": "optional note"
}
\`\`\`

### Note shape
\`\`\`json
{
  "_type": "note",
  "shapeId": "note1",
  "x": 100,
  "y": 100,
  "color": "yellow",
  "text": "Remember this",
  "size": "m",
  "font": "draw",
  "note": "optional note"
}
\`\`\`

### Draw shape
\`\`\`json
{
  "_type": "draw",
  "shapeId": "scribble1",
  "color": "blue",
  "fill": "none",
  "note": "optional note"
}
\`\`\`

### Frame shape
\`\`\`json
{
  "_type": "frame",
  "shapeId": "backend",
  "x": 0,
  "y": 0,
  "w": 500,
  "h": 300,
  "name": "Backend Services",
  "children": ["api", "db", "cache"],
  "note": "optional note"
}
\`\`\`

### Enums
- Geo \`_type\`: rectangle, ellipse, triangle, diamond, hexagon, pill, cloud, x-box, check-box, heart, pentagon, octagon, star, parallelogram-right, parallelogram-left, trapezoid, fat-arrow-right, fat-arrow-left, fat-arrow-up, fat-arrow-down, geo
- Colors: red, light-red, green, light-green, blue, light-blue, orange, yellow, black, violet, light-violet, grey, white
- Fill: none, tint, background, solid, pattern
- Dash: draw, solid, dashed, dotted
- Size: s, m, l, xl
- Font: draw, sans, serif, mono
- Text anchor: bottom-center, bottom-left, bottom-right, center-left, center-right, center, top-center, top-left, top-right
- Text align: start, middle, end

## Available action tools

### new_canvas
Creates and opens a new interactive canvas widget.
- Input: none

### create_shapes
Creates one or more shapes.
- \`shapes\`: JSON string of FocusedShape[] OR FocusedShape[] directly

### delete_shapes
Deletes shapes by ID.
- \`shapeIds\`: JSON string of string[] OR string[] directly

### update_shapes
Updates existing shapes using FocusedShapeUpdate[] entries.
- \`updates\`: JSON string of FocusedShapeUpdate[] OR FocusedShapeUpdate[] directly
- Each update requires \`shapeId\`
- Supported update keys:
\`_type\`, \`anchor\`, \`bend\`, \`children\`, \`color\`, \`dash\`, \`fill\`, \`font\`, \`fontSize\`, \`fromId\`, \`h\`, \`maxWidth\`, \`name\`, \`note\`, \`size\`, \`subType\`, \`text\`, \`textAlign\`, \`toId\`, \`w\`, \`x\`, \`x1\`, \`x2\`, \`y\`, \`y1\`, \`y2\`

### get_canvas_state
Returns the active canvas snapshot (shape records + focusedShapes + metadata).
- Input: none

## Example tool payloads

### create_shapes
\`\`\`json
{
  "shapes": [
    { "_type": "rectangle", "shapeId": "start", "x": 0, "y": 0, "w": 200, "h": 100, "color": "blue", "fill": "tint", "text": "Start" },
    { "_type": "arrow", "shapeId": "a1", "x1": 200, "y1": 50, "x2": 320, "y2": 50, "color": "black", "fromId": "start", "toId": "process" },
    { "_type": "rectangle", "shapeId": "process", "x": 320, "y": 0, "w": 220, "h": 100, "color": "green", "fill": "tint", "text": "Process" }
  ]
}
\`\`\`

### update_shapes
\`\`\`json
{
  "updates": [
    { "shapeId": "process", "text": "Validate Input", "color": "orange" },
    { "shapeId": "a1", "text": "next", "bend": 12 }
  ]
}
\`\`\`

### delete_shapes
\`\`\`json
{
  "shapeIds": ["a1", "legacy_box"]
}
\`\`\`
`

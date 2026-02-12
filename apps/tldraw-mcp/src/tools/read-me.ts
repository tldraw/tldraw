/** read_me tool — returns the FocusedShape format reference and action tool documentation. */

export const READ_ME_CONTENT = `# tldraw MCP — shape format and action reference

Call this tool first to understand the FocusedShape format and available actions.

## Workflow

1. Use mutation tools (\`create_shapes\`, \`draw_pen\`, \`move_shapes\`, \`update_shapes\`, etc.) to build up your diagram
2. Call \`create_view\` **exactly once** as the **final step** to render and display the diagram

**IMPORTANT**: Only call \`create_view\` ONCE per response. Each call creates a new rendered diagram widget. Calling it multiple times produces duplicate diagrams. Use \`create_shapes\`, \`update_shapes\`, \`move_shapes\`, etc. for all modifications, then call \`create_view\` once at the end.

For simple diagrams, you can pass shapes directly to \`create_view\` and skip separate mutation calls.

## FocusedShape format

Shapes use a simplified "FocusedShape" format. Each shape is a JSON object with a \`_type\` discriminator and a unique \`shapeId\`.

### Geo shapes (rectangle, ellipse, etc.)
\`\`\`json
{
  "_type": "rectangle",
  "shapeId": "box1",
  "x": 100, "y": 100,
  "w": 200, "h": 100,
  "color": "blue",
  "fill": "tint",
  "dash": "draw",
  "size": "m",
  "font": "draw",
  "text": "Hello",
  "textAlign": "middle"
}
\`\`\`

**Geo types**: rectangle, ellipse, triangle, diamond, hexagon, pill, cloud, x-box, check-box, heart, pentagon, octagon, star, parallelogram-right, parallelogram-left, trapezoid, fat-arrow-right, fat-arrow-left, fat-arrow-up, fat-arrow-down

### Text shapes
\`\`\`json
{
  "_type": "text",
  "shapeId": "label1",
  "x": 100, "y": 100,
  "text": "Hello World",
  "color": "black",
  "anchor": "top-left",
  "size": "m",
  "font": "draw",
  "maxWidth": null
}
\`\`\`

**Anchors**: top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right

The anchor controls both position interpretation and text alignment. \`maxWidth\` enables word wrapping when set to a number (null = auto-size).

### Arrow shapes
\`\`\`json
{
  "_type": "arrow",
  "shapeId": "arrow1",
  "x1": 300, "y1": 150,
  "x2": 500, "y2": 150,
  "color": "black",
  "text": "connects",
  "fromId": "box1",
  "toId": "box2",
  "bend": 0
}
\`\`\`

- \`x1,y1\` and \`x2,y2\` are absolute canvas coordinates for start and end
- \`fromId\`/\`toId\` (optional, nullable) bind the arrow to shapes so it stays connected when shapes move
- \`bend\` (optional) controls curvature — positive bends right, negative bends left, 0 is straight

### Line shapes
\`\`\`json
{
  "_type": "line",
  "shapeId": "line1",
  "x1": 100, "y1": 100,
  "x2": 300, "y2": 200,
  "color": "grey"
}
\`\`\`

### Note shapes (sticky notes)
\`\`\`json
{
  "_type": "note",
  "shapeId": "note1",
  "x": 100, "y": 100,
  "color": "yellow",
  "text": "Remember this"
}
\`\`\`

### Frame shapes (containers)
\`\`\`json
{
  "_type": "frame",
  "shapeId": "backend",
  "x": 0, "y": 0,
  "w": 500, "h": 300,
  "name": "Backend Services",
  "children": ["api", "db", "cache"]
}
\`\`\`

Frames group shapes visually. Child shapes listed in \`children\` are reparented into the frame. Create the child shapes in the same \`create_shapes\` call or before the frame.

## Style options

All shapes render with a hand-drawn, sketchy aesthetic by default (\`dash: "draw"\`, \`font: "draw"\`).

**Colors**: black, grey, light-violet, violet, blue, light-blue, yellow, orange, green, light-green, light-red, red, white

**Fill styles**: none (outline only), tint (light color wash — recommended default), background (semi-transparent), solid (fully filled), pattern (cross-hatch — use sparingly)

**Dash styles** (optional, default "draw"): draw (hand-drawn wobbly edges), solid (clean straight edges), dashed, dotted

**Size** (optional, default "m"): s (thin/small), m (medium), l (large/thick), xl (extra large/thick). Controls stroke weight and text size. Use "l" or "xl" for bold, prominent shapes.

**Font** (optional, default "draw"): draw (hand-written), sans, serif, mono

### Style tips
- Use \`"fill": "tint"\` for most filled shapes — it's clean and readable
- Keep \`"dash": "draw"\` for the hand-drawn aesthetic; use \`"solid"\` for technical/clean diagrams
- Use \`"size": "l"\` for important shapes, \`"s"\` for secondary details
- Mix \`"font": "draw"\` (for labels) with \`"font": "sans"\` (for technical text)

## Available action tools

### create_view ⭐ (renders the diagram — call ONCE)
Display the diagram as an inline widget. Call this **exactly once** as the last step — each call creates a new widget. Never call it multiple times in the same response.
- \`shapes\`: Optional JSON string — array of FocusedShape objects to create before rendering
- \`title\`: Optional diagram title
- \`action\`: Optional mode — \`"create"\` (default, clears canvas then creates shapes), \`"add"\` (keeps existing shapes and appends new ones), \`"clear"\` (clears canvas and renders empty)

### create_shapes
Create one or more shapes. Pass a JSON array of FocusedShape objects.
- \`shapes\`: JSON string — array of FocusedShape objects
- \`title\`: Optional diagram title

### delete_shapes
Remove shapes by ID.
- \`shapeIds\`: JSON string — array of shape ID strings

### move_shapes
Reposition shapes to new coordinates.
- \`moves\`: JSON string — array of \`{ "shapeId": "id", "x": 100, "y": 200 }\`

### resize_shapes
Scale shapes relative to an origin point.
- \`shapeIds\`: JSON string — array of shape ID strings
- \`scaleX\`, \`scaleY\`: Scale factors (1.0 = no change, 2.0 = double)
- \`originX\`, \`originY\`: Origin point for scaling

### rotate_shapes
Rotate shapes around an origin point.
- \`shapeIds\`: JSON string — array of shape ID strings
- \`degrees\`: Rotation angle in degrees
- \`originX\`, \`originY\`: Center of rotation

### align_shapes
Align shapes along an edge or center.
- \`shapeIds\`: JSON string — array of shape ID strings
- \`alignment\`: left, center-horizontal, right, top, center-vertical, bottom

### distribute_shapes
Distribute shapes evenly along an axis.
- \`shapeIds\`: JSON string — array of shape ID strings
- \`direction\`: horizontal or vertical

### label_shape
Update the text label on a shape.
- \`shapeId\`: Shape ID string
- \`text\`: New label text

### draw_pen
Create a freehand drawing from points.
- \`shapeId\`: ID for the new draw shape
- \`points\`: JSON string — array of \`{ "x": 0, "y": 0 }\` points
- \`color\`: Optional color
- \`fill\`: Optional fill style
- \`closed\`: Optional boolean — close the path
- \`style\`: Optional dash style (draw, solid, dashed, dotted)

### update_shapes
Update properties on existing shapes without recreating them.
- \`updates\`: JSON string — array of \`{ "shapeId": "id", "color": "red", "text": "new label", ... }\`
- Supported properties: x, y, w, h, color, fill, dash, size, font, text, textAlign, name

### get_canvas_state
Get the current canvas state in FocusedShape format (the same format used by create_shapes). Useful for inspecting what's on the canvas before making changes.

### group_shapes
Group shapes into a single unit.
- \`shapeIds\`: JSON string — array of shape ID strings to group
- \`groupId\`: ID for the new group

### ungroup_shapes
Ungroup a group back into individual shapes.
- \`groupId\`: Group shape ID to ungroup

### clear_canvas
Remove all shapes and reset the canvas.

### use_template
Generate a diagram from a predefined template layout. Creates a starting skeleton you can refine.
- \`template\`: Template name — \`flowchart-lr\`, \`flowchart-tb\`, \`org-chart\`, \`architecture\`, \`mind-map\`, \`sequence\`
- \`labels\`: JSON string — array of label strings, one per node/actor
- \`title\`: Optional diagram title

Templates create shapes and arrows automatically. Refine with \`update_shapes\` or \`move_shapes\`.

## Layout tips

- Canvas: x increases right, y increases down (top-left origin)
- Typical shape sizes: 150–300px wide, 80–150px tall
- Leave 50–100px gaps between shapes
- For flowcharts: use consistent spacing (e.g., 250px horizontal, 180px vertical)

### Flowchart example
\`\`\`json
[
  { "_type": "rectangle", "shapeId": "start", "x": 0, "y": 0, "w": 200, "h": 100, "color": "blue", "fill": "tint", "text": "Start" },
  { "_type": "arrow", "shapeId": "a1", "x1": 200, "y1": 50, "x2": 300, "y2": 50, "color": "black", "fromId": "start", "toId": "process" },
  { "_type": "rectangle", "shapeId": "process", "x": 300, "y": 0, "w": 200, "h": 100, "color": "green", "fill": "tint", "text": "Process" },
  { "_type": "arrow", "shapeId": "a2", "x1": 500, "y1": 50, "x2": 600, "y2": 50, "color": "black", "fromId": "process", "toId": "end" },
  { "_type": "rectangle", "shapeId": "end", "x": 600, "y": 0, "w": 200, "h": 100, "color": "red", "fill": "tint", "text": "End" }
]
\`\`\`

### Architecture diagram
\`\`\`json
[
  { "_type": "rectangle", "shapeId": "frontend", "x": 0, "y": 0, "w": 200, "h": 100, "color": "blue", "fill": "tint", "text": "Frontend" },
  { "_type": "rectangle", "shapeId": "api", "x": 300, "y": 0, "w": 200, "h": 100, "color": "green", "fill": "tint", "text": "API Server" },
  { "_type": "rectangle", "shapeId": "db", "x": 600, "y": 0, "w": 200, "h": 100, "color": "orange", "fill": "tint", "text": "Database" },
  { "_type": "arrow", "shapeId": "a1", "x1": 200, "y1": 50, "x2": 300, "y2": 50, "color": "black", "fromId": "frontend", "toId": "api", "text": "REST" },
  { "_type": "arrow", "shapeId": "a2", "x1": 500, "y1": 50, "x2": 600, "y2": 50, "color": "black", "fromId": "api", "toId": "db", "text": "SQL" }
]
\`\`\`
`

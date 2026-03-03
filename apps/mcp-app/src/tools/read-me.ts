/** read_me tool — returns the FocusedShape format and action tool documentation. */

/* eslint-disable no-useless-escape */
export const READ_ME_CONTENT = `# tldraw MCP — shape format and action reference

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
  "new_blank_canvas": true,
  "shapesJson": "[{\"_type\":\"rectangle\",\"shapeId\":\"start\",\"x\":0,\"y\":0,\"w\":200,\"h\":100,\"color\":\"blue\",\"fill\":\"tint\",\"text\":\"Start\"},{\"_type\":\"arrow\",\"shapeId\":\"a1\",\"x1\":200,\"y1\":50,\"x2\":320,\"y2\":50,\"color\":\"black\",\"fromId\":\"start\",\"toId\":\"process\"},{\"_type\":\"rectangle\",\"shapeId\":\"process\",\"x\":320,\"y\":0,\"w\":220,\"h\":100,\"color\":\"green\",\"fill\":\"tint\",\"text\":\"Process\"}]"
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

## Empty canvases

- If a user asks for a new blank canvas, or asks you to pull up a canvas or board for them with no other context, call create_shapes with new_blank_canvas: true and an empty \`shapesJson\` array.

## Diagram examples

### Simple flowchart — two connected boxes

\`\`\`json
[
  {"_type":"rectangle","shapeId":"start","x":0,"y":0,"w":200,"h":100,"color":"blue","fill":"tint","text":"Start"},
  {"_type":"rectangle","shapeId":"end","x":320,"y":0,"w":200,"h":100,"color":"green","fill":"tint","text":"End"},
  {"_type":"arrow","shapeId":"a1","x1":200,"y1":50,"x2":320,"y2":50,"color":"black","fromId":"start","toId":"end","text":"next"}
]
\`\`\`

### Decision flowchart — login flow with branching and retry loop

\`\`\`json
[
  {"_type":"text","shapeId":"title","x":250,"y":0,"text":"Login Flow","color":"black","anchor":"top-center","size":"xl","font":"sans"},
  {"_type":"pill","shapeId":"enter","x":150,"y":80,"w":200,"h":80,"color":"blue","fill":"tint","text":"User visits /login"},
  {"_type":"rectangle","shapeId":"form","x":150,"y":220,"w":200,"h":100,"color":"light-blue","fill":"tint","text":"Show login form"},
  {"_type":"arrow","shapeId":"a1","x1":250,"y1":160,"x2":250,"y2":220,"color":"black","fromId":"enter","toId":"form"},
  {"_type":"diamond","shapeId":"valid","x":125,"y":390,"w":250,"h":160,"color":"orange","fill":"tint","text":"Credentials\\nvalid?"},
  {"_type":"arrow","shapeId":"a2","x1":250,"y1":320,"x2":250,"y2":390,"color":"black","fromId":"form","toId":"valid","text":"submit"},
  {"_type":"rectangle","shapeId":"dashboard","x":420,"y":410,"w":220,"h":100,"color":"green","fill":"tint","text":"Redirect to\\ndashboard"},
  {"_type":"arrow","shapeId":"a3","x1":375,"y1":470,"x2":420,"y2":460,"color":"green","fromId":"valid","toId":"dashboard","text":"yes"},
  {"_type":"rectangle","shapeId":"error","x":-160,"y":410,"w":220,"h":100,"color":"red","fill":"tint","text":"Show error\\nmessage"},
  {"_type":"arrow","shapeId":"a4","x1":125,"y1":470,"x2":60,"y2":460,"color":"red","fromId":"valid","toId":"error","text":"no"},
  {"_type":"arrow","shapeId":"a5","x1":-50,"y1":410,"x2":150,"y2":270,"color":"grey","dash":"dashed","fromId":"error","toId":"form","text":"retry","bend":70}
]
\`\`\`

Key techniques:
- Use \`pill\` for start/end nodes and \`diamond\` for decision points
- Bind arrows with \`fromId\`/\`toId\` so they stay connected when shapes move
- Use \`bend\` on the retry arrow to curve it around the other shapes
- Use \`dash: "dashed"\` for secondary/optional flows
- Center the title text using \`anchor: "top-center"\`

### Architecture diagram — layered system with rectangles

\`\`\`json
[
  {"_type":"text","shapeId":"title","x":350,"y":0,"text":"Web App Architecture","color":"black","anchor":"top-center","size":"xl","font":"sans"},
  {"_type":"rectangle","shapeId":"fe-frame","x":0,"y":60,"w":700,"h":180,"color":"blue","fill":"tint","text":"Frontend"},
  {"_type":"rectangle","shapeId":"browser","x":30,"y":100,"w":200,"h":100,"color":"blue","fill":"tint","text":"React SPA"},
  {"_type":"rectangle","shapeId":"cdn","x":270,"y":100,"w":160,"h":100,"color":"light-blue","fill":"tint","text":"CDN"},
  {"_type":"rectangle","shapeId":"lb","x":470,"y":100,"w":200,"h":100,"color":"violet","fill":"tint","text":"Load Balancer"},
  {"_type":"arrow","shapeId":"a1","x1":230,"y1":150,"x2":270,"y2":150,"color":"grey","fromId":"browser","toId":"cdn"},
  {"_type":"arrow","shapeId":"a2","x1":430,"y1":150,"x2":470,"y2":150,"color":"grey","fromId":"cdn","toId":"lb"},
  {"_type":"rectangle","shapeId":"be-frame","x":0,"y":280,"w":700,"h":180,"color":"green","fill":"tint","text":"Backend"},
  {"_type":"rectangle","shapeId":"api","x":30,"y":320,"w":200,"h":100,"color":"green","fill":"tint","text":"API Server\\n(Node.js)"},
  {"_type":"rectangle","shapeId":"auth","x":270,"y":320,"w":160,"h":100,"color":"orange","fill":"tint","text":"Auth Service"},
  {"_type":"cloud","shapeId":"queue","x":470,"y":310,"w":200,"h":120,"color":"yellow","fill":"tint","text":"Message\\nQueue"},
  {"_type":"arrow","shapeId":"a3","x1":570,"y1":240,"x2":130,"y2":320,"color":"black","fromId":"lb","toId":"api","text":"routes"},
  {"_type":"arrow","shapeId":"a4","x1":230,"y1":370,"x2":270,"y2":370,"color":"grey","fromId":"api","toId":"auth"},
  {"_type":"arrow","shapeId":"a5","x1":430,"y1":370,"x2":470,"y2":370,"color":"grey","fromId":"auth","toId":"queue"},
  {"_type":"rectangle","shapeId":"db-frame","x":0,"y":500,"w":700,"h":180,"color":"red","fill":"tint","text":"Data layer"},
  {"_type":"ellipse","shapeId":"db","x":30,"y":540,"w":200,"h":100,"color":"red","fill":"tint","text":"PostgreSQL"},
  {"_type":"ellipse","shapeId":"cache","x":270,"y":540,"w":160,"h":100,"color":"light-red","fill":"tint","text":"Redis"},
  {"_type":"rectangle","shapeId":"s3","x":470,"y":540,"w":200,"h":100,"color":"light-green","fill":"tint","text":"S3 Storage"},
  {"_type":"arrow","shapeId":"a6","x1":130,"y1":420,"x2":130,"y2":540,"color":"black","fromId":"api","toId":"db"},
  {"_type":"arrow","shapeId":"a7","x1":350,"y1":420,"x2":350,"y2":540,"color":"black","fromId":"auth","toId":"cache"},
  {"_type":"arrow","shapeId":"a8","x1":570,"y1":430,"x2":570,"y2":540,"color":"black","fromId":"queue","toId":"s3"}
]
\`\`\`

Key techniques:
- Use \`rectangle\` shapes to visually group related components into layers
- Use different \`_type\` values to convey meaning: \`ellipse\` for databases, \`cloud\` for queues/services
- Assign a distinct color per layer (blue=frontend, green=backend, red=data) for quick visual parsing
- Cross-layer arrows use \`"color":"black"\` to stand out; within-layer arrows use \`"color":"grey"\`
- Center the title over the diagram using \`anchor: "top-center"\` with an x value at the midpoint
`

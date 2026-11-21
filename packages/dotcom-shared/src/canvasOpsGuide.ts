/** What the canvas ops are and how to write them, for the description of any tool that takes a batch. */
export const CANVAS_OPS_GUIDE = `A failing op is reported and the rest still run. The result says what each op did, where shapes landed and what was adjusted. Split large work across calls. Page coordinates: y grows downward.

Ops:
- add: a label (text), note, box, ellipse or shape (any geo), at \`at\` (top-left) or relative to a \`target\` (\`relation\`, \`gap\`, \`align\`). A box sizes to its text unless given w/h. Its text is its label, drawn inside it; use \\n for line breaks.
- place: move a shape (\`at\`, or \`relation\` + \`target\`) and/or change its w, h, text and style.
- label: a text label on a shape or a page point, optionally with an arrow.
- connect: an arrow between two shapes (bound to them) or points. Reusing an arrow's id replaces it.
- rename, restyle (or \`like\` another shape), resize, remove, untangle (spread overlapping shapes).
- path: a polyline or curve through page points. closed: true makes a fillable outline.
- duplicate: copy a shape to a new position.

Refer to shapes by id, {text}, {description}, {selected: true} or {created: "last" | index}. Give new shapes short ids so later ops can refer to them.

Put a card's words in the box's own text, not in labels laid over it. Keep shapes from overlapping unless one sits inside another. Change only what the request asks for.`

/**
 * Lightweight mermaid detection replicating mermaid's own detectType preprocessing
 * (from mermaid v11.12.2 src/diagram-api/detectType.ts and src/diagram-api/regexes.ts).
 *
 * https://github.com/mermaid-js/mermaid/blob/277c4967f97405e9bb172c0a2f67f462a672b162/packages/mermaid/src/diagram-api/detectType.ts
 * https://github.com/mermaid-js/mermaid/blob/277c4967f97405e9bb172c0a2f67f462a672b162/packages/mermaid/src/diagram-api/regexes.ts
 *
 * Strips YAML frontmatter, %%{...}%% directives, and %% comments, then tests for
 * a known diagram keyword at the start of the cleaned text.
 *
 * This file intentionally has zero imports so it can be loaded statically without
 * pulling in the heavy mermaid library.
 */
const FRONTMATTER_REGEX = /^-{3}\s*[\n\r]([\s\S]*?)[\n\r]-{3}\s*[\n\r]+/

/**
 * A diagram keyword at the start of the text, optionally followed by a known
 * variant suffix (`-beta`, `-v2`). The trailing `(?![\w-])` is a word boundary
 * that rejects keywords glued to more text: "kanban-board", "gantt-chart" and
 * "information" do not match, while "sankey-beta" and "graph LR" do. Group 1 is
 * the keyword, group 2 the variant suffix (if any).
 */
const DIAGRAM_KEYWORD_REGEX =
	/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|sankey|xychart|block|quadrantChart|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packet|kanban|architecture|treemap|radar|info)(-beta|-v\d+)?(?![\w-])/

/**
 * Leading ```mermaid (or longer run) fence, closed by the first line that ends
 * the same run length (CommonMark-style: inner shorter ``` lines do not close a
 * longer fence). Trailing markdown after the block is allowed so multi-block
 * pastes do not pull in later fences. Group 1 = fence run, group 2 = diagram body.
 */
const MARKDOWN_MERMAID_FENCE_REGEX =
	/^\s*(```+)\s*mermaid\s*\r?\n([\s\S]*?)\r?\n\s*\1\s*(?:[\s\S]*)$/

/**
 * Strip mermaid boilerplate (frontmatter, directives, comments) so only the
 * diagram body remains. The two global regexes are created as fresh literals
 * each call to avoid the stateful-lastIndex footgun of module-level /g regexes.
 */
function stripMermaidBoilerplate(text: string): string {
	return text
		.replace(FRONTMATTER_REGEX, '')
		.replace(/%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi, '')
		.replace(/\s*%%.*\n/gm, '\n')
}

export function stripMarkdownMermaidFence(text: string): string {
	const match = text.match(MARKDOWN_MERMAID_FENCE_REGEX)
	return match ? match[2] : text
}

export function simpleMermaidStringTest(text: string): boolean {
	const unfenced = stripMarkdownMermaidFence(text)
	const cleaned = stripMermaidBoilerplate(unfenced).trim()
	const match = cleaned.match(DIAGRAM_KEYWORD_REGEX)
	if (!match) return false

	// An explicit ```mermaid fence means the user has declared their intent, so
	// a bare keyword inside it is enough.
	if (unfenced !== text) return true

	// A recognized variant suffix (e.g. "sankey-beta", "stateDiagram-v2") is a
	// clear diagram signal on its own.
	if (match[2]) return true

	// Otherwise require multi-line diagram structure. Real diagrams put the type
	// keyword on its own line, optionally followed by a flowchart direction
	// ("graph LR") or a pie modifier ("pie title ..."). The keyword line must
	// match that shape and be followed by a body line. This rejects prose that
	// merely starts with a keyword and trails into more text, whether on one
	// line ("pie in the sky") or several ("journey home\nto my heart"), while
	// still accepting "graph LR\n  A --> B" and "journey\n  title My day".
	const remainder = cleaned.slice(match[0].length)
	const keywordLine = remainder.match(/^[^\n\r]*/)![0].trim()
	const isDiagramKeywordLine =
		keywordLine === '' || /^(?:TB|TD|BT|RL|LR|title\b|showData\b)/i.test(keywordLine)
	if (!isDiagramKeywordLine) return false
	return /[\n\r]\s*\S/.test(remainder)
}

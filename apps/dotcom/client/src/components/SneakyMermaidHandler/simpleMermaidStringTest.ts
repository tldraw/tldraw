/**
 * Lightweight mermaid detection replicating mermaid's own detectType preprocessing
 * (from mermaid v11.12.2 src/diagram-api/detectType.ts and src/diagram-api/regexes.ts).
 * Strips YAML frontmatter, %%{...}%% directives, and %% comments, then tests for
 * a known diagram keyword at the start of the cleaned text.
 *
 * This file intentionally has zero imports so it can be loaded statically without
 * pulling in the heavy mermaid library.
 */
const FRONTMATTER_REGEX = /^-{3}\s*[\n\r]([\s\S]*?)[\n\r]-{3}\s*[\n\r]+/
const DIRECTIVE_REGEX =
	/%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi
const COMMENT_REGEX = /\s*%%.*\n/gm
const DIAGRAM_KEYWORD_REGEX =
	/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|sankey|xychart|block|quadrantChart|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packet|kanban|architecture|treemap|radar|info)/

export function simpleMermaidStringTest(text: string): boolean {
	const cleaned = text
		.replace(FRONTMATTER_REGEX, '')
		.replace(DIRECTIVE_REGEX, '')
		.replace(COMMENT_REGEX, '\n')
	return DIAGRAM_KEYWORD_REGEX.test(cleaned)
}

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
const DIAGRAM_KEYWORD_REGEX =
	/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|sankey|xychart|block|quadrantChart|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packet|kanban|architecture|treemap|radar|info)/

/**
 * Captures the inner content of a mermaid code blog marked by ```mermaid
 */
const MARKDOWN_MERMAID_FENCE_REGEX = /^\s*```+\s*mermaid\s*\n([\s\S]*?)\n\s*```+\s*$/

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
	return match ? match[1] : text
}

export function simpleMermaidStringTest(text: string): boolean {
	return DIAGRAM_KEYWORD_REGEX.test(stripMermaidBoilerplate(stripMarkdownMermaidFence(text)))
}

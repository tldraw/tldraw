/**
 * Malicious SVG detection patterns.
 *
 * Each rule has a regex pattern, a human-readable description, and a severity
 * level. Severity "high" means almost certainly malicious; "medium" means
 * suspicious and warrants manual review.
 */

export interface ScanRule {
	name: string
	pattern: RegExp
	description: string
	severity: 'high' | 'medium'
}

export interface ScanFinding {
	rule: string
	severity: 'high' | 'medium'
	description: string
	/** First match snippet (truncated) */
	match: string
}

export interface ScanResult {
	key: string
	bucket: string
	findings: ScanFinding[]
	scannedAt: string
	sizeBytes: number
}

const SCAN_RULES: ScanRule[] = [
	// --- High severity: almost certainly malicious ---
	{
		name: 'script-tag',
		pattern: /<script[\s>]/gi,
		description: '<script> tag found',
		severity: 'high',
	},
	{
		name: 'event-handler',
		pattern: /\bon\w+\s*=/gi,
		description: 'Inline event handler attribute (onclick, onerror, onload, etc.)',
		severity: 'high',
	},
	{
		name: 'javascript-uri',
		pattern: /javascript\s*:/gi,
		description: 'javascript: URI scheme',
		severity: 'high',
	},
	{
		name: 'vbscript-uri',
		pattern: /vbscript\s*:/gi,
		description: 'vbscript: URI scheme',
		severity: 'high',
	},
	{
		name: 'data-text-html',
		pattern: /data\s*:\s*text\/html/gi,
		description: 'data:text/html URI (can embed arbitrary HTML/JS)',
		severity: 'high',
	},
	{
		name: 'iframe-tag',
		pattern: /<iframe[\s>]/gi,
		description: '<iframe> tag found',
		severity: 'high',
	},
	{
		name: 'embed-tag',
		pattern: /<embed[\s>]/gi,
		description: '<embed> tag found',
		severity: 'high',
	},
	{
		name: 'object-tag',
		pattern: /<object[\s>]/gi,
		description: '<object> tag found',
		severity: 'high',
	},
	{
		name: 'foreignobject-tag',
		pattern: /<foreignObject[\s>]/gi,
		description: '<foreignObject> tag (can embed arbitrary HTML)',
		severity: 'high',
	},
	{
		name: 'meta-refresh',
		pattern: /<meta[\s][^>]*http-equiv/gi,
		description: '<meta http-equiv> (potential redirect or content injection)',
		severity: 'high',
	},
	{
		name: 'base-tag',
		pattern: /<base[\s>]/gi,
		description: '<base> tag (can redirect all relative URLs)',
		severity: 'high',
	},
	{
		name: 'import-tag',
		pattern: /<import[\s>]/gi,
		description: '<import> tag',
		severity: 'high',
	},

	// --- Medium severity: suspicious, warrants review ---
	{
		name: 'external-xlink-href',
		pattern: /xlink:href\s*=\s*["']https?:\/\//gi,
		description: 'External xlink:href reference',
		severity: 'medium',
	},
	{
		name: 'external-href',
		pattern: /\bhref\s*=\s*["']https?:\/\//gi,
		description: 'External href reference',
		severity: 'medium',
	},
	{
		name: 'data-uri-xlink',
		pattern: /xlink:href\s*=\s*["']data:/gi,
		description: 'data: URI in xlink:href',
		severity: 'medium',
	},
	{
		name: 'use-external',
		pattern: /<use[\s][^>]*href\s*=\s*["']https?:\/\//gi,
		description: '<use> with external reference',
		severity: 'medium',
	},
	{
		name: 'feimage-external',
		pattern: /<feImage[\s][^>]*href\s*=\s*["']https?:\/\//gi,
		description: '<feImage> with external reference',
		severity: 'medium',
	},
	{
		name: 'set-attributename',
		pattern: /<set[\s][^>]*attributeName\s*=\s*["']on/gi,
		description: '<set> animating an event handler attribute',
		severity: 'high',
	},
	{
		name: 'animate-event-attr',
		pattern: /<animate[\s][^>]*attributeName\s*=\s*["']on/gi,
		description: '<animate> targeting an event handler attribute',
		severity: 'high',
	},
	{
		name: 'eval-call',
		pattern: /\beval\s*\(/gi,
		description: 'eval() call',
		severity: 'high',
	},
	{
		name: 'expression-binding',
		pattern: /expression\s*\(/gi,
		description: 'CSS expression() (IE-specific script execution)',
		severity: 'high',
	},
	{
		name: 'entity-encoding-bypass',
		pattern: /&#x?[0-9a-fA-F]+;/gi,
		description: 'HTML entity encoding (potential obfuscation)',
		severity: 'medium',
	},
]

/**
 * Scan SVG content for malicious patterns.
 *
 * Returns an array of findings. An empty array means the SVG looks clean.
 */
export function scanSvgContent(content: string): ScanFinding[] {
	const findings: ScanFinding[] = []

	for (const rule of SCAN_RULES) {
		// Reset lastIndex for global regexes
		rule.pattern.lastIndex = 0
		const match = rule.pattern.exec(content)
		if (match) {
			findings.push({
				rule: rule.name,
				severity: rule.severity,
				description: rule.description,
				match: match[0].substring(0, 100),
			})
		}
	}

	return findings
}

/**
 * Quick check: does this key look like an SVG?
 * Checks file extension. The caller should also check httpMetadata.contentType
 * from R2 if available.
 */
export function isSvgKey(key: string): boolean {
	return key.toLowerCase().endsWith('.svg')
}

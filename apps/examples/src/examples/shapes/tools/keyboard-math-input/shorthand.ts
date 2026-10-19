// Translates keyboard-friendly shorthand into LaTeX for KaTeX to render.
// It's a small chain of regex rewrites, applied in order:
//
//   1/2                  → \frac{1}{2}
//   sqrt(2)              → \sqrt{2}
//   x^10, e^(i pi)       → x^{10}, e^{i \pi}
//   pi, theta, inf       → \pi, \theta, \infty
//   +-, ->, <=, >=, !=   → \pm, \to, \le, \ge, \ne
//
// Anything it doesn't recognize (including raw LaTeX commands) passes
// through untouched, so power users can still type \frac{a}{b} directly.

// A fraction operand: a number/word, optionally followed by one brace or
// paren group so \sqrt{2} and sin(x) stay whole, or a bare parenthesized
// group with no nested parens.
const OPERAND = /(?:\\?[A-Za-z0-9.]+(?:\{[^{}]*\}|\([^()]*\))?|\([^()]*\))/
const FRACTION = new RegExp(`(${OPERAND.source})\\s*/\\s*(${OPERAND.source})`, 'g')

// Letter-based boundaries rather than \b, so names still match when touching
// an underscore or caret (int_0, x^inf), but not inside words (point, using)
const NAMED =
	/(?<![\\A-Za-z])(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|sigma|phi|omega|pi|infty|inf|int|sum|prod|lim|sin|cos|tan|log|ln)(?![A-Za-z])/g

function stripParens(s: string) {
	return s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s
}

export function translateToLatex(text: string): string {
	return (
		text
			// Two-character operators first, before anything eats their pieces
			.replace(/\+-/g, '\\pm ')
			.replace(/->/g, '\\to ')
			.replace(/<=/g, '\\le ')
			.replace(/>=/g, '\\ge ')
			.replace(/!=/g, '\\ne ')
			// sqrt(...) → \sqrt{...}
			.replace(/sqrt\(([^()]*)\)/g, '\\sqrt{$1}')
			// Superscripts and subscripts: brace parenthesized or multi-character
			// arguments so KaTeX applies the script to the whole thing
			.replace(/([\^_])\(([^()]*)\)/g, '$1{$2}')
			.replace(/([\^_])([A-Za-z0-9]{2,})/g, '$1{$2}')
			// a/b → \frac{a}{b}
			.replace(FRACTION, (_m, a, b) => `\\frac{${stripParens(a)}}{${stripParens(b)}}`)
			// Named symbols and functions, unless already escaped
			.replace(NAMED, (m) => `\\${m === 'inf' ? 'infty' : m}`)
	)
}

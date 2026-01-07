import type { editor } from 'monaco-editor'

export const lightTheme: editor.IStandaloneThemeData = {
	base: 'vs',
	inherit: false,
	rules: [
		// Base
		{ token: '', foreground: '5c6166', background: 'fafafa' },

		// Comments
		{ token: 'comment', foreground: '787b80', fontStyle: 'italic' },
		{ token: 'comment.js', foreground: '787b80', fontStyle: 'italic' },
		{ token: 'comment.line', foreground: '787b80', fontStyle: 'italic' },
		{ token: 'comment.block', foreground: '787b80', fontStyle: 'italic' },

		// Strings
		{ token: 'string', foreground: '86b300' },
		{ token: 'string.js', foreground: '86b300' },
		{ token: 'string.quoted', foreground: '86b300' },
		{ token: 'string.template', foreground: '86b300' },

		// Numbers
		{ token: 'number', foreground: 'a37acc' },
		{ token: 'number.js', foreground: 'a37acc' },
		{ token: 'constant.numeric', foreground: 'a37acc' },

		// Keywords
		{ token: 'keyword', foreground: 'fa8d3e' },
		{ token: 'keyword.js', foreground: 'fa8d3e' },
		{ token: 'keyword.control', foreground: 'fa8d3e' },
		{ token: 'keyword.operator', foreground: 'ed9366' },
		{ token: 'keyword.other', foreground: 'fa8d3e' },
		{ token: 'storage', foreground: 'fa8d3e' },
		{ token: 'storage.type', foreground: 'fa8d3e' },

		// Operators
		{ token: 'operator', foreground: 'ed9366' },
		{ token: 'delimiter', foreground: '5c616680' },
		{ token: 'delimiter.bracket', foreground: '5c616680' },
		{ token: 'delimiter.parenthesis', foreground: '5c616680' },

		// Functions
		{ token: 'entity.name.function', foreground: 'f2ae49' },
		{ token: 'support.function', foreground: 'f2ae49' },
		{ token: 'function', foreground: 'f2ae49' },
		{ token: 'identifier.js', foreground: '5c6166' },

		// Variables & Identifiers
		{ token: 'variable', foreground: '5c6166' },
		{ token: 'variable.parameter', foreground: 'a37acc' },
		{ token: 'variable.other', foreground: '5c6166' },
		{ token: 'identifier', foreground: '5c6166' },

		// Constants
		{ token: 'constant', foreground: 'a37acc' },
		{ token: 'constant.language', foreground: 'a37acc' },
		{ token: 'constant.language.boolean', foreground: 'a37acc' },
		{ token: 'constant.language.null', foreground: 'a37acc' },
		{ token: 'constant.language.undefined', foreground: 'a37acc' },

		// Types & Classes
		{ token: 'type', foreground: '399ee6' },
		{ token: 'type.identifier', foreground: '399ee6' },
		{ token: 'entity.name.type', foreground: '399ee6' },
		{ token: 'entity.name.class', foreground: '399ee6' },
		{ token: 'class', foreground: '399ee6' },
		{ token: 'interface', foreground: '399ee6' },
		{ token: 'support.class', foreground: '399ee6' },
		{ token: 'support.type', foreground: '399ee6' },

		// HTML/JSX Tags
		{ token: 'tag', foreground: '55b4d4' },
		{ token: 'tag.js', foreground: '55b4d4' },
		{ token: 'metatag', foreground: '55b4d4' },
		{ token: 'attribute.name', foreground: 'f2ae49' },
		{ token: 'attribute.value', foreground: '86b300' },

		// Regex
		{ token: 'regexp', foreground: '4cbf99' },
		{ token: 'string.regexp', foreground: '4cbf99' },

		// Special
		{ token: 'meta.brace', foreground: '5c616680' },
		{ token: 'punctuation', foreground: '5c616680' },
	],
	colors: {
		'editor.background': '#fafafa',
		'editor.foreground': '#5c6166',
		'editor.lineHighlightBackground': '#f0f0f0',
		'editor.lineHighlightBorder': '#f0f0f0',
		'editor.selectionBackground': '#d1e4f4',
		'editor.inactiveSelectionBackground': '#e8e8e8',
		'editorLineNumber.foreground': '#9199a1',
		'editorLineNumber.activeForeground': '#5c6166',
		'editorCursor.foreground': '#ff9940',
		'editorWhitespace.foreground': '#d9d9d9',
		'editorIndentGuide.background': '#e8e8e8',
		'editorIndentGuide.activeBackground': '#d0d0d0',
		'editorGutter.background': '#f3f3f3',
		'editorWidget.background': '#fafafa',
		'editorWidget.border': '#e0e0e0',
		'editorSuggestWidget.background': '#fafafa',
		'editorSuggestWidget.border': '#e0e0e0',
		'editorSuggestWidget.selectedBackground': '#d1e4f4',
		'editorHoverWidget.background': '#fafafa',
		'editorHoverWidget.border': '#e0e0e0',
		'input.background': '#ffffff',
		'input.border': '#e0e0e0',
		focusBorder: '#ff994033',
		'list.activeSelectionBackground': '#d1e4f4',
		'list.hoverBackground': '#e8e8e8',
		'scrollbarSlider.background': '#9199a133',
		'scrollbarSlider.hoverBackground': '#9199a155',
		'scrollbarSlider.activeBackground': '#9199a177',
	},
}

export const darkTheme: editor.IStandaloneThemeData = {
	base: 'vs-dark',
	inherit: false,
	rules: [
		// Base
		{ token: '', foreground: 'cbccc6', background: '1f2430' },

		// Comments
		{ token: 'comment', foreground: '5c6773', fontStyle: 'italic' },
		{ token: 'comment.js', foreground: '5c6773', fontStyle: 'italic' },
		{ token: 'comment.line', foreground: '5c6773', fontStyle: 'italic' },
		{ token: 'comment.block', foreground: '5c6773', fontStyle: 'italic' },

		// Strings
		{ token: 'string', foreground: 'bae67e' },
		{ token: 'string.js', foreground: 'bae67e' },
		{ token: 'string.quoted', foreground: 'bae67e' },
		{ token: 'string.template', foreground: 'bae67e' },

		// Numbers
		{ token: 'number', foreground: 'ffcc66' },
		{ token: 'number.js', foreground: 'ffcc66' },
		{ token: 'constant.numeric', foreground: 'ffcc66' },

		// Keywords
		{ token: 'keyword', foreground: 'ffa759' },
		{ token: 'keyword.js', foreground: 'ffa759' },
		{ token: 'keyword.control', foreground: 'ffa759' },
		{ token: 'keyword.operator', foreground: 'f29e74' },
		{ token: 'keyword.other', foreground: 'ffa759' },
		{ token: 'storage', foreground: 'ffa759' },
		{ token: 'storage.type', foreground: 'ffa759' },

		// Operators
		{ token: 'operator', foreground: 'f29e74' },
		{ token: 'delimiter', foreground: 'cbccc6b3' },
		{ token: 'delimiter.bracket', foreground: 'cbccc6b3' },
		{ token: 'delimiter.parenthesis', foreground: 'cbccc6b3' },

		// Functions
		{ token: 'entity.name.function', foreground: 'ffd580' },
		{ token: 'support.function', foreground: 'ffd580' },
		{ token: 'function', foreground: 'ffd580' },
		{ token: 'identifier.js', foreground: 'cbccc6' },

		// Variables & Identifiers
		{ token: 'variable', foreground: 'cbccc6' },
		{ token: 'variable.parameter', foreground: 'd4bfff' },
		{ token: 'variable.other', foreground: 'cbccc6' },
		{ token: 'identifier', foreground: 'cbccc6' },

		// Constants
		{ token: 'constant', foreground: 'ffcc66' },
		{ token: 'constant.language', foreground: 'ffcc66' },
		{ token: 'constant.language.boolean', foreground: 'ffcc66' },
		{ token: 'constant.language.null', foreground: 'ffcc66' },
		{ token: 'constant.language.undefined', foreground: 'ffcc66' },

		// Types & Classes
		{ token: 'type', foreground: '73d0ff' },
		{ token: 'type.identifier', foreground: '73d0ff' },
		{ token: 'entity.name.type', foreground: '73d0ff' },
		{ token: 'entity.name.class', foreground: '73d0ff' },
		{ token: 'class', foreground: '73d0ff' },
		{ token: 'interface', foreground: '73d0ff' },
		{ token: 'support.class', foreground: '73d0ff' },
		{ token: 'support.type', foreground: '73d0ff' },

		// HTML/JSX Tags
		{ token: 'tag', foreground: '5ccfe6' },
		{ token: 'tag.js', foreground: '5ccfe6' },
		{ token: 'metatag', foreground: '5ccfe6' },
		{ token: 'attribute.name', foreground: 'ffd580' },
		{ token: 'attribute.value', foreground: 'bae67e' },

		// Regex
		{ token: 'regexp', foreground: '95e6cb' },
		{ token: 'string.regexp', foreground: '95e6cb' },

		// Special
		{ token: 'meta.brace', foreground: 'cbccc6b3' },
		{ token: 'punctuation', foreground: 'cbccc6b3' },
	],
	colors: {
		'editor.background': '#1f2430',
		'editor.foreground': '#cbccc6',
		'editor.lineHighlightBackground': '#191e2a',
		'editor.lineHighlightBorder': '#191e2a',
		'editor.selectionBackground': '#34455a',
		'editor.inactiveSelectionBackground': '#2d3b4d',
		'editorLineNumber.foreground': '#707a8c',
		'editorLineNumber.activeForeground': '#cbccc6',
		'editorCursor.foreground': '#ffcc66',
		'editorWhitespace.foreground': '#3e4b59',
		'editorIndentGuide.background': '#3e4b59',
		'editorIndentGuide.activeBackground': '#5c6773',
		'editorGutter.background': '#1a1f29',
		'editorWidget.background': '#1f2430',
		'editorWidget.border': '#101521',
		'editorSuggestWidget.background': '#1f2430',
		'editorSuggestWidget.border': '#101521',
		'editorSuggestWidget.selectedBackground': '#34455a',
		'editorHoverWidget.background': '#1f2430',
		'editorHoverWidget.border': '#101521',
		'input.background': '#1a1f29',
		'input.border': '#101521',
		focusBorder: '#ffcc6633',
		'list.activeSelectionBackground': '#34455a',
		'list.hoverBackground': '#2d3b4d',
		'scrollbarSlider.background': '#707a8c33',
		'scrollbarSlider.hoverBackground': '#707a8c55',
		'scrollbarSlider.activeBackground': '#707a8c77',
	},
}

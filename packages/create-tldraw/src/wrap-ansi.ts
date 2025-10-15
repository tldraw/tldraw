/*!
 * This is a fork of wrap-ansi, adding the ability to customize the string inserted at the start of each wrapped line.
 * MIT License: https://github.com/chalk/wrap-ansi/blob/163b878a6eb5d8c32b7bbea65036eeadc0e4def9/license
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 * https://github.com/chalk/wrap-ansi/blob/163b878a6eb5d8c32b7bbea65036eeadc0e4def9/index.js
 */

import ansiStyles from 'ansi-styles'
import stringWidth from 'string-width'
import stripAnsi from 'strip-ansi'

interface WrapAnsiOptions {
	trim?: boolean
	wordWrap?: boolean
	hard?: boolean
	indent?: string
}

const ESCAPES = new Set(['\u001B', '\u009B'])

const END_CODE = 39
const ANSI_ESCAPE_BELL = '\u0007'
const ANSI_CSI = '['
const ANSI_OSC = ']'
const ANSI_SGR_TERMINATOR = 'm'
const ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`

function wrapAnsiCode(code: number) {
	return `${ESCAPES.values().next().value}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`
}
function wrapAnsiHyperlink(url: string) {
	return `${ESCAPES.values().next().value}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`
}

// Calculate the length of words split on ' ', ignoring
// the extra characters added by ansi escape codes
function wordLengths(string: string) {
	return string.split(' ').map((character) => stringWidth(character))
}

// Wrap a long word across multiple rows
// Ansi escape codes do not count towards length
function wrapWord(rows: string[], word: string, columns: number, indent: string) {
	const characters = [...word]

	let isInsideEscape = false
	let isInsideLinkEscape = false
	let visible = stringWidth(stripAnsi(rows.at(-1)!))

	const indentLength = stringWidth(indent)

	for (const [index, character] of characters.entries()) {
		const characterLength = stringWidth(character)

		if (visible + characterLength <= columns) {
			rows[rows.length - 1] += character
		} else {
			rows.push(`${indent}${character}`)
			visible = indentLength
		}

		if (ESCAPES.has(character)) {
			isInsideEscape = true

			const ansiEscapeLinkCandidate = characters
				.slice(index + 1, index + 1 + ANSI_ESCAPE_LINK.length)
				.join('')
			isInsideLinkEscape = ansiEscapeLinkCandidate === ANSI_ESCAPE_LINK
		}

		if (isInsideEscape) {
			if (isInsideLinkEscape) {
				if (character === ANSI_ESCAPE_BELL) {
					isInsideEscape = false
					isInsideLinkEscape = false
				}
			} else if (character === ANSI_SGR_TERMINATOR) {
				isInsideEscape = false
			}

			continue
		}

		visible += characterLength

		if (visible === columns && index < characters.length - 1) {
			rows.push(indent)
			visible = indentLength
		}
	}

	// It's possible that the last row we copy over is only
	// ansi escape characters, handle this edge-case
	if (!visible && rows.at(-1)!.length > 0 && rows.length > 1) {
		rows[rows.length - 2] += rows.pop()
	}
}

// Trims spaces from a string ignoring invisible sequences
function stringVisibleTrimSpacesRight(string: string) {
	const words = string.split(' ')
	let last = words.length

	while (last > 0) {
		if (stringWidth(words[last - 1]) > 0) {
			break
		}

		last--
	}

	if (last === words.length) {
		return string
	}

	return words.slice(0, last).join(' ') + words.slice(last).join('')
}

// The wrap-ansi module can be invoked in either 'hard' or 'soft' wrap mode.
//
// 'hard' will never allow a string to take up more than columns characters.
//
// 'soft' allows long words to expand past the column length.
function exec(string: string, columns: number, options: WrapAnsiOptions = {}) {
	if (options.trim !== false && string.trim() === '') {
		return ''
	}

	const indent = options.indent ?? ''
	const indentLength = stringWidth(indent)

	// Extract original leading whitespace if we want to preserve it
	const originalLeadingWhitespace = string.match(/^(\s*)/)?.[1] || ''
	const trimmedString = string.trimStart()

	// Adjust column width to account for original leading whitespace on first row
	const shouldPreserveLeadingWhitespace =
		(options.trim === false || options.indent) && originalLeadingWhitespace
	const adjustedColumns = shouldPreserveLeadingWhitespace
		? columns - stringWidth(originalLeadingWhitespace)
		: columns

	let returnValue = ''
	let escapeCode
	let escapeUrl

	const lengths = wordLengths(trimmedString)
	let rows = ['']
	let isFirstRow = true
	const rowsWithIndent = new Set<number>()

	for (const [index, word] of trimmedString.split(' ').entries()) {
		if (options.trim !== false && !isFirstRow && !rowsWithIndent.has(rows.length - 1)) {
			rows[rows.length - 1] = rows.at(-1)!.trimStart()
		}

		let rowLength = stringWidth(rows.at(-1)!)

		if (index !== 0) {
			const currentColumns = isFirstRow ? adjustedColumns : columns
			if (rowLength >= currentColumns && (options.wordWrap === false || options.trim === false)) {
				// If we start with a new word but the current row length equals the length of the columns, add a new row
				rows.push(indent)
				rowsWithIndent.add(rows.length - 1)
				rowLength = indentLength
				isFirstRow = false
			}

			if (rowLength > 0 || options.trim === false) {
				rows[rows.length - 1] += ' '
				rowLength++
			}
		}

		// In 'hard' wrap mode, the length of a line is never allowed to extend past 'columns'
		const currentColumns = isFirstRow ? adjustedColumns : columns
		if (options.hard && lengths[index] > currentColumns) {
			const remainingColumns = currentColumns - rowLength
			const breaksStartingThisLine =
				1 + Math.floor((lengths[index] - remainingColumns - 1) / currentColumns)
			const breaksStartingNextLine = Math.floor((lengths[index] - 1) / currentColumns)
			if (breaksStartingNextLine < breaksStartingThisLine) {
				rows.push(indent)
				rowsWithIndent.add(rows.length - 1)
				isFirstRow = false
			}

			wrapWord(rows, word, currentColumns, indent)
			continue
		}

		const currentColumnsForWrap = isFirstRow ? adjustedColumns : columns
		if (rowLength + lengths[index] > currentColumnsForWrap && rowLength > 0 && lengths[index] > 0) {
			if (options.wordWrap === false && rowLength < currentColumnsForWrap) {
				wrapWord(rows, word, currentColumnsForWrap, indent)
				continue
			}

			rows.push(indent)
			rowsWithIndent.add(rows.length - 1)
			isFirstRow = false
		}

		const newCurrentColumns = isFirstRow ? adjustedColumns : columns
		if (rowLength + lengths[index] > newCurrentColumns && options.wordWrap === false) {
			wrapWord(rows, word, newCurrentColumns, indent)
			continue
		}

		rows[rows.length - 1] += word
	}

	if (options.trim !== false) {
		rows = rows.map((row) => stringVisibleTrimSpacesRight(row))
	}

	// Add original leading whitespace to the first row when needed
	if (originalLeadingWhitespace && rows.length > 0) {
		if (options.trim === false || options.indent) {
			rows[0] = originalLeadingWhitespace + rows[0]
		}
	}

	const preString = rows.join('\n')
	const pre = [...preString]

	// We need to keep a separate index as `String#slice()` works on Unicode code units, while `pre` is an array of codepoints.
	let preStringIndex = 0

	for (const [index, character] of pre.entries()) {
		returnValue += character

		if (ESCAPES.has(character)) {
			const { groups } = new RegExp(
				`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`
			).exec(preString.slice(preStringIndex)) || { groups: { code: undefined, uri: undefined } }
			if (groups!.code !== undefined) {
				const code = Number.parseFloat(groups!.code)
				escapeCode = code === END_CODE ? undefined : code
			} else if (groups!.uri !== undefined) {
				escapeUrl = groups!.uri.length === 0 ? undefined : groups!.uri
			}
		}

		const code = ansiStyles.codes.get(Number(escapeCode))

		if (pre[index + 1] === '\n') {
			if (escapeUrl) {
				returnValue += wrapAnsiHyperlink('')
			}

			if (escapeCode && code) {
				returnValue += wrapAnsiCode(code)
			}
		} else if (character === '\n') {
			if (escapeCode && code) {
				returnValue += wrapAnsiCode(escapeCode)
			}

			if (escapeUrl) {
				returnValue += wrapAnsiHyperlink(escapeUrl)
			}
		}

		preStringIndex += character.length
	}

	return returnValue
}

// For each newline, invoke the method separately
export function wrapAnsi(string: string, columns: number, options: WrapAnsiOptions) {
	return String(string)
		.normalize()
		.replaceAll('\r\n', '\n')
		.split('\n')
		.map((line) => exec(line, columns, options))
		.join('\n')
}

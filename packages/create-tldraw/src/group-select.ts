/*!
 * This is a fork of @clack/prompts's select prompt, but with the ability to group options by a string.
 * MIT License: https://github.com/bombshell-dev/clack/blob/1adb270af5509ead3d22c4fa602b465f39c7a8c2/packages/prompts/LICENSE
 * Copyright (c) Nate Moore
 * https://github.com/bombshell-dev/clack/blob/1adb270af5509ead3d22c4fa602b465f39c7a8c2/packages/prompts/src/select.ts
 */

import { SelectPrompt } from '@clack/core'
import {
	Option,
	S_BAR,
	S_RADIO_ACTIVE,
	S_RADIO_INACTIVE,
	SelectOptions,
	symbol,
} from '@clack/prompts'
import process from 'node:process'
import { WriteStream } from 'node:tty'
import picocolors from 'picocolors'
import { wrapAnsi } from './wrap-ansi'

export type GroupSelectOption<Value> = Option<Value> & {
	group?: string
	hint: string
}

export interface GroupSelectOptions<Value> extends SelectOptions<Value> {
	options: GroupSelectOption<Value>[]
}

function limit(
	contents: string,
	rows: number,
	focusCharacter: string,
	truncateLine = picocolors.dim('...')
) {
	const lines = contents.split('\n')
	const focusLine = Math.max(
		0,
		lines.findIndex((line) => line.includes(focusCharacter))
	)

	if (lines.length <= rows) {
		return contents
	}

	const outputLines = []
	// if we're right at the top, we don't truncate above:
	if (focusLine < 2) {
		outputLines.push(...lines.slice(0, rows - 1), truncateLine)
	} else if (focusLine + rows - 2 > lines.length) {
		// if we're right at the bottom, we don't truncate below:
		outputLines.push(truncateLine, ...lines.slice(lines.length - rows + 1))
	} else {
		// otherwise, we truncate the middle:
		outputLines.push(
			truncateLine,
			...lines.slice(focusLine - 1, focusLine + rows - 2),
			truncateLine
		)
	}

	return outputLines.join('\n')
}

export function groupSelect<Value>(opts: GroupSelectOptions<Value>) {
	const opt = (option: GroupSelectOption<Value>, state: 'inactive' | 'active') => {
		const label = option.label ?? String(option.value)

		if (state !== 'active') {
			return [picocolors.dim(S_RADIO_INACTIVE), ' ', picocolors.dim(label)].join('')
		}

		return [
			picocolors.green(S_RADIO_ACTIVE),
			' ',
			picocolors.bold(label),
			'\n  ',
			picocolors.cyan(S_BAR),
			'    ',
			option.hint,
			'\n',
			picocolors.cyan(S_BAR),
		].join('')
	}

	return new SelectPrompt({
		options: opts.options,
		signal: opts.signal,
		input: opts.input,
		output: opts.output,
		initialValue: opts.initialValue,
		render() {
			const title = `${picocolors.gray(S_BAR)}\n${symbol(this.state)}  ${picocolors.bold(opts.message)}\n`

			if (this.state === 'submit') {
				return [
					title,
					picocolors.gray(S_BAR),
					'  ',
					picocolors.dim(this.options[this.cursor].label),
				].join('')
			} else if (this.state === 'cancel') {
				return [
					title,
					picocolors.gray(S_BAR),
					'  ',
					picocolors.strikethrough(picocolors.dim(this.options[this.cursor].label)),
					'\n',
					picocolors.gray(S_BAR),
				].join('')
			}

			const selectedOption = this.options[this.cursor]
			let previousGroup = undefined
			const body = []

			for (const option of this.options) {
				if (option.group !== previousGroup) {
					if (previousGroup) body.push(picocolors.cyan(S_BAR), '\n')
					body.push(picocolors.cyan(S_BAR), '  ', option.group, '\n')
				}
				body.push(
					picocolors.cyan(S_BAR),
					'  ',
					opt(option, option === selectedOption ? 'active' : 'inactive'),
					'\n'
				)
				previousGroup = option.group
			}

			const output = opts.output ?? process.stdout
			const columns = output instanceof WriteStream ? output.columns : 80
			const rows = output instanceof WriteStream ? output.rows : 10

			const wrapped = wrapAnsi(body.join(''), columns, {
				indent: [picocolors.cyan(S_BAR), '    '].join(''),
			})

			const limited = limit(
				wrapped,
				rows - 3,
				S_RADIO_ACTIVE,
				[picocolors.cyan(S_BAR), picocolors.dim(' ...')].join('')
			)

			return [title, limited].join('')
		},
	}).prompt() as Promise<Value | symbol>
}

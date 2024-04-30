/* eslint-disable no-console */
import { HistoryManager, RecordsDiff } from '@tldraw/editor'
// eslint-disable-next-line import/no-extraneous-dependencies
import { DiffOptions, diff as jestDiff } from 'jest-diff'
import { inspect } from 'util'

class Printer {
	private _output = ''
	private _indent = 0

	appendLines(str: string) {
		const indent = '  '.repeat(this._indent)
		this._output +=
			str
				.split('\n')
				.map((line) => indent + line)
				.join('\n') + '\n'
	}

	indent() {
		this._indent++
	}
	dedent() {
		this._indent--
	}

	log(...args: any[]) {
		this.appendLines(args.map((arg) => (typeof arg === 'string' ? arg : inspect(arg))).join(' '))
	}

	print() {
		console.log(this._output)
	}

	get() {
		return this._output
	}
}

export function prettyPrintDiff(diff: RecordsDiff<any>, opts?: DiffOptions) {
	const before = {} as Record<string, any>
	const after = {} as Record<string, any>

	for (const added of Object.values(diff.added)) {
		after[added.id] = added
	}
	for (const [from, to] of Object.values(diff.updated)) {
		before[from.id] = from
		after[to.id] = to
	}
	for (const removed of Object.values(diff.removed)) {
		before[removed.id] = removed
	}

	const prettyDiff = jestDiff(after, before, {
		aAnnotation: 'After',
		bAnnotation: 'Before',
		aIndicator: '+',
		bIndicator: '-',
		...opts,
	})

	if (prettyDiff?.includes('Compared values have no visual difference.')) {
		const p = new Printer()
		p.log('Before & after have no visual difference.')
		p.log('Diff:')
		p.indent()
		p.log(diff)
		return p.get()
	}

	return prettyDiff
}

export function logHistory(history: HistoryManager<any>) {
	const { undos, redos, pendingDiff } = history.debug()
	const p = new Printer()
	p.log('=== History ===')
	p.indent()

	p.log('Pending diff:')
	p.indent()
	if (pendingDiff.isEmpty) {
		p.log('(empty)')
	} else {
		p.log(prettyPrintDiff(pendingDiff.diff))
	}
	p.log('')
	p.dedent()

	p.log('Undos:')
	p.indent()
	if (undos.length === 0) {
		p.log('(empty)\n')
	}
	for (const undo of undos) {
		if (!undo) continue
		if (undo.type === 'stop') {
			p.log('Stop', undo.id)
		} else {
			p.log('- Diff')
			p.indent()
			p.log(prettyPrintDiff(undo.diff))
			p.dedent()
		}
		p.log('')
	}
	p.dedent()

	p.log('Redos:')
	p.indent()
	if (redos.length === 0) {
		p.log('(empty)\n')
	}
	for (const redo of redos) {
		if (!redo) continue
		if (redo.type === 'stop') {
			p.log('> Stop', redo.id)
		} else {
			p.log('- Diff')
			p.indent()
			p.log(prettyPrintDiff(redo.diff))
			p.dedent()
		}
		p.log('')
	}

	p.print()
}

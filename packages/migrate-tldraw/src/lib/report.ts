/**
 * Report formatters. The default human formatter is shaped for direct terminal
 * consumption; the JSON formatter emits a stable shape for tooling integration
 * (CI, IDE plugins, the LLM skill).
 */

import * as path from 'node:path'
import { colors } from './colors'
import type { FileResult, Transform } from './types'

export interface RunSummary {
	transform: Transform
	targetDir: string
	results: FileResult[]
	dryRun: boolean
	durationMs: number
}

export interface RunCounts {
	filesScanned: number
	filesFixed: number
	totalFlags: number
	fixesByName: Map<string, number>
	flagsByName: Map<string, number>
}

export function summarize(results: FileResult[]): RunCounts {
	let filesFixed = 0
	let totalFlags = 0
	const fixesByName = new Map<string, number>()
	const flagsByName = new Map<string, number>()
	for (const r of results) {
		if (r.changed) filesFixed++
		for (const f of r.fixes) fixesByName.set(f.name, (fixesByName.get(f.name) ?? 0) + 1)
		for (const f of r.flags) {
			totalFlags++
			flagsByName.set(f.flag.name, (flagsByName.get(f.flag.name) ?? 0) + 1)
		}
	}
	return {
		filesScanned: results.length,
		filesFixed,
		totalFlags,
		fixesByName,
		flagsByName,
	}
}

export function formatHuman(summary: RunSummary): string {
	const out: string[] = []
	const counts = summarize(summary.results)
	const dryTag = summary.dryRun ? ` ${colors.yellow('[dry run]')}` : ''
	out.push('')
	out.push(`${colors.bold(summary.transform.title)} migration${dryTag}`)
	out.push(colors.dim(`Scanning ${summary.targetDir}`))
	out.push('')

	for (const r of summary.results) {
		if (!r.changed && r.flags.length === 0) continue
		const rel = path.relative(summary.targetDir, r.path) || path.basename(r.path)
		if (r.changed) {
			const tag = summary.dryRun ? colors.yellow('[would fix]') : colors.green('[fixed]')
			out.push(`  ${tag} ${rel}`)
			for (const fix of r.fixes) {
				out.push(`    ${colors.green('•')} ${fix.name}`)
			}
		}
	}

	if (counts.fixesByName.size > 0) {
		out.push('')
		out.push(colors.bold('── Auto-fixes applied ──'))
		for (const [name, count] of counts.fixesByName) {
			out.push(`  ${colors.green(`${count}x`)}  ${name}`)
		}
	}

	if (counts.totalFlags > 0) {
		out.push('')
		out.push(`${colors.bold(colors.red('── Manual review required ──'))}`)
		out.push(colors.dim('  These lines reference APIs that changed or were removed.'))
		out.push(colors.dim(`  See bundled SKILL.md for guided remediation.`))
		out.push('')
		for (const r of summary.results) {
			if (r.flags.length === 0) continue
			const rel = path.relative(summary.targetDir, r.path) || path.basename(r.path)
			out.push(`  ${colors.bold(rel)}`)
			const sortedFlags = [...r.flags].sort((a, b) => a.line - b.line || a.col - b.col)
			for (const { line, col, flag } of sortedFlags) {
				out.push(
					`    ${colors.cyan(`${String(line).padStart(5)}:${String(col).padEnd(3)}`)}  ${colors.yellow(`[${flag.name}]`)}`
				)
				out.push(`           ${colors.dim(flag.note)}`)
			}
			out.push('')
		}
	}

	out.push(colors.bold('── Summary ──'))
	out.push(`  Files scanned:   ${counts.filesScanned}`)
	out.push(`  Files auto-fixed: ${colors.bold(String(counts.filesFixed))}`)
	out.push(
		`  Lines to review:  ${counts.totalFlags > 0 ? colors.yellow(String(counts.totalFlags)) : colors.bold('0')}`
	)
	out.push(`  Time:             ${summary.durationMs}ms`)
	out.push('')

	return out.join('\n')
}

export interface JsonReport {
	transform: { id: string; title: string }
	dryRun: boolean
	targetDir: string
	durationMs: number
	files: {
		path: string
		changed: boolean
		fixes: { id: string; name: string }[]
		flags: { id: string; name: string; line: number; col: number; note: string }[]
	}[]
	counts: {
		filesScanned: number
		filesFixed: number
		totalFlags: number
		fixes: Record<string, number>
		flags: Record<string, number>
	}
}

export function formatJson(summary: RunSummary): string {
	const counts = summarize(summary.results)
	const report: JsonReport = {
		transform: { id: summary.transform.id, title: summary.transform.title },
		dryRun: summary.dryRun,
		targetDir: summary.targetDir,
		durationMs: summary.durationMs,
		files: summary.results.map((r) => ({
			path: r.path,
			changed: r.changed,
			fixes: r.fixes,
			flags: r.flags.map((f) => ({
				id: f.flag.id,
				name: f.flag.name,
				line: f.line,
				col: f.col,
				note: f.flag.note,
			})),
		})),
		counts: {
			filesScanned: counts.filesScanned,
			filesFixed: counts.filesFixed,
			totalFlags: counts.totalFlags,
			fixes: Object.fromEntries(counts.fixesByName),
			flags: Object.fromEntries(counts.flagsByName),
		},
	}
	return JSON.stringify(report, null, 2)
}

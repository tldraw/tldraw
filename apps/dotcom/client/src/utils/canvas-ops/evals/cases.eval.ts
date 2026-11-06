import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { afterAll, describe, test } from 'vitest'
import { createTestEditor } from '../testEditor'
import { EVAL_MODEL, runAgent, type AgentRun } from './agent'
import { boardProblems, snapshot } from './board'
import { cases, grade } from './cases'

const TRIALS = Math.max(1, Number(process.env.CANVAS_OPS_EVAL_TRIALS ?? 1))

// Under jsdom, `URL` is jsdom's, which node's fileURLToPath does not accept; work from the string.
const RUN_DIR = `${join(dirname(fileURLToPath(import.meta.url)), 'runs', new Date().toISOString().replace(/[:.]/g, '-'))}/`

type Outcome = 'pass' | 'fail' | 'api-error'
const results: Array<{
	name: string
	trial: number
	outcome: Outcome
	batches: number
	costUsd: number
	error?: string
}> = []

function record(file: string, data: unknown) {
	mkdirSync(RUN_DIR, { recursive: true })
	writeFileSync(`${RUN_DIR}${file}`, JSON.stringify(data, null, '\t'))
}

describe
	.skipIf(!process.env.ANTHROPIC_API_KEY)
	.concurrent(`canvas ops evals (${EVAL_MODEL})`, () => {
		for (const c of cases) {
			for (let trial = 1; trial <= TRIALS; trial++) {
				const label = TRIALS > 1 ? `${c.name} #${trial}` : c.name
				const file = `${c.name.replace(/[^a-z0-9]+/gi, '-')}${TRIALS > 1 ? `-${trial}` : ''}.json`
				test(label, async () => {
					const editor = createTestEditor()
					try {
						c.setup?.(editor)
						const before = snapshot(editor)
						const problemsBefore = boardProblems(editor, before)
						let run: AgentRun
						try {
							run = await runAgent(editor, c.task)
						} catch (e) {
							// An API failure says nothing about the ops; keep it out of the pass rate.
							if (!(e instanceof Anthropic.APIError)) throw e
							results.push({
								name: c.name,
								trial,
								outcome: 'api-error',
								batches: 0,
								costUsd: 0,
								error: e.message,
							})
							record(file, { case: c, model: EVAL_MODEL, apiError: e.message })
							throw e
						}
						const graded = grade(editor, before, problemsBefore, run)
						let error: string | undefined
						try {
							c.check(graded)
						} catch (e) {
							error = (e as Error).message
							throw e
						} finally {
							results.push({
								name: c.name,
								trial,
								outcome: error ? 'fail' : 'pass',
								batches: run.batches.length,
								costUsd: run.costUsd,
								error,
							})
							record(file, {
								case: c,
								model: EVAL_MODEL,
								trial,
								error,
								run,
								problems: graded.problems,
								before: [...before.values()],
								after: [...graded.after.values()],
							})
						}
					} finally {
						editor.dispose()
					}
				})
			}
		}
	})

afterAll(() => {
	if (!results.length) return
	const byCase = new Map<string, typeof results>()
	for (const r of results) byCase.set(r.name, [...(byCase.get(r.name) ?? []), r])
	const graded = results.filter((r) => r.outcome !== 'api-error')
	const passed = graded.filter((r) => r.outcome === 'pass').length
	const apiErrors = results.length - graded.length
	const cost = results.reduce((sum, r) => sum + r.costUsd, 0)
	const lines = [
		`${passed}/${graded.length} passed on ${EVAL_MODEL}${TRIALS > 1 ? `, ${TRIALS} trials each` : ''}, $${cost.toFixed(2)}${apiErrors ? `; ${apiErrors} API errors not counted` : ''}`,
	]
	for (const name of [...byCase.keys()].sort()) {
		const runs = byCase.get(name)!
		const ok = runs.filter((r) => r.outcome === 'pass').length
		const errored = runs.filter((r) => r.outcome === 'api-error').length
		const status =
			errored === runs.length ? 'ERROR' : ok === runs.length - errored ? 'pass' : 'FAIL'
		const batches = runs.reduce((sum, r) => sum + r.batches, 0)
		const spent = runs.reduce((sum, r) => sum + r.costUsd, 0)
		lines.push(
			`${status.padEnd(5)} ${name}  (${ok}/${runs.length - errored}${errored ? `, ${errored} API errors` : ''}, ${batches} batches, $${spent.toFixed(3)})`
		)
		for (const r of runs.filter((r) => r.error))
			lines.push(`      ${r.trial}: ${r.error!.split('\n')[0]}`)
	}
	lines.push(`runs: ${RUN_DIR}`)
	mkdirSync(RUN_DIR, { recursive: true })
	writeFileSync(`${RUN_DIR}summary.txt`, `${lines.join('\n')}\n`)
	process.stdout.write(`${lines.join('\n')}\n`)
})

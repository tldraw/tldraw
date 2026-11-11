import { composeRules } from './compose'

type Rule = (args: { n: number }) => { reason: string } | null

describe('composeRules', () => {
	it('allows when every rule allows, and when there are no rules', () => {
		const allow: Rule = () => null
		expect(composeRules(allow, allow)({ n: 1 })).toBeNull()
		expect(composeRules<{ n: number }, { reason: string }>()({ n: 1 })).toBeNull()
	})

	it('returns the first refusal and does not run the rules after it', () => {
		const ran: string[] = []
		const rule =
			(name: string, refuse: boolean): Rule =>
			() => {
				ran.push(name)
				return refuse ? { reason: name } : null
			}
		const composed = composeRules(rule('a', false), rule('b', true), rule('c', true))
		expect(composed({ n: 1 })).toEqual({ reason: 'b' })
		expect(ran).toEqual(['a', 'b'])
	})

	it('passes the same args to every rule', () => {
		const seen: number[] = []
		const record: Rule = ({ n }) => (seen.push(n), null)
		composeRules(record, record)({ n: 7 })
		expect(seen).toEqual([7, 7])
	})
})

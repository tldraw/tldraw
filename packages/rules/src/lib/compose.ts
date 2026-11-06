import { TLRuleSource, TLRulesDefinition, TLTypeRules } from './rules'

/**
 * A piece of a rule set that a feature or plugin ships: its own record types, actions, and the
 * `let`s that are its extension points.
 *
 * @public
 */
export type TLRulesFragment = Partial<Omit<TLRulesDefinition, 'version' | 'default'>>

function both(a: TLRuleSource | undefined, b: TLRuleSource | undefined): TLRuleSource | undefined {
	if (a === undefined) return b
	if (b === undefined) return a
	const src = (x: TLRuleSource) => (typeof x === 'string' ? x : x.allow)
	const message = (typeof b !== 'string' && b.message) || (typeof a !== 'string' && a.message)
	const allow = `(${src(a)}) && (${src(b)})`
	return message ? { allow, message } : allow
}

/**
 * Combine a base definition with fragments, left to right.
 *
 * - Rules for the same type and op are joined with `&&`: a fragment can only narrow.
 * - `stamp` and `frozen` entries add up.
 * - A later `let` replaces an earlier one of the same name. That is how a host widens a feature:
 *   the comment rules ask `mayDeleteComment`, and a host can redefine it to include moderators.
 * - An action defined twice is an error, since a host verb has one owner.
 *
 * @public
 */
export function composeRules(
	base: TLRulesDefinition,
	...fragments: TLRulesFragment[]
): TLRulesDefinition {
	const out: TLRulesDefinition = {
		...base,
		let: { ...base.let },
		actions: { ...base.actions },
		types: { ...base.types },
	}
	for (const fragment of fragments) {
		Object.assign(out.let!, fragment.let)
		for (const [name, src] of Object.entries(fragment.actions ?? {})) {
			if (name in out.actions!) throw new Error(`composeRules: action '${name}' is defined twice`)
			out.actions![name] = src
		}
		for (const [typeName, rules] of Object.entries(fragment.types ?? {})) {
			const prev: TLTypeRules = out.types![typeName] ?? {}
			out.types![typeName] = {
				read: both(prev.read, rules.read),
				create: both(prev.create, rules.create),
				update: both(prev.update, rules.update),
				delete: both(prev.delete, rules.delete),
				stamp: { ...prev.stamp, ...rules.stamp },
				frozen: [...(prev.frozen ?? []), ...(rules.frozen ?? [])],
			}
			for (const op of ['read', 'create', 'update', 'delete'] as const) {
				if (out.types![typeName][op] === undefined) delete out.types![typeName][op]
			}
		}
		if (fragment.pushes) out.pushes = fragment.pushes
	}
	return out
}

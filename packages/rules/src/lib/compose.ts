import { TLFieldRule, TLRuleSource, TLRulesDefinition, TLTypeRules } from './rules'

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
 * - Rules for the same type and op are joined with `&&`: a fragment can only narrow. For a type the
 *   base lists, an op the base leaves to `default` is joined with the default. A type the base does
 *   not list belongs to the fragment, so include only fragments you trust with their own types.
 * - A path stamped twice is an error: a fragment cannot replace the base's trusted value.
 * - `stamp` and `frozen` entries add up. Two `fields` rules for one path are joined with `&&`, and
 *   the later `hidden` value wins.
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
			const listed = Object.hasOwn(out.types!, typeName)
			const prev: TLTypeRules = listed ? out.types![typeName] : {}
			// For a type the base lists, an op it left to `default` is still the base's: narrow the
			// default. A type the base does not list is the fragment's own (a plugin's shape type).
			const baseFor = (op: 'read' | 'create' | 'update' | 'delete') =>
				prev[op] ?? (listed ? (op === 'read' ? base.default.read : base.default.write) : undefined)
			for (const path of Object.keys(rules.stamp ?? {})) {
				if (prev.stamp && Object.hasOwn(prev.stamp, path)) {
					throw new Error(`composeRules: ${typeName}.stamp.${path} is stamped twice`)
				}
			}
			out.types![typeName] = {
				read: rules.read === undefined ? prev.read : both(baseFor('read'), rules.read),
				create: rules.create === undefined ? prev.create : both(baseFor('create'), rules.create),
				update: rules.update === undefined ? prev.update : both(baseFor('update'), rules.update),
				delete: rules.delete === undefined ? prev.delete : both(baseFor('delete'), rules.delete),
				stamp: { ...prev.stamp, ...rules.stamp },
				frozen: [...(prev.frozen ?? []), ...(rules.frozen ?? [])],
				fields: { ...prev.fields },
			}
			for (const [path, field] of Object.entries(rules.fields ?? {})) {
				const before: TLFieldRule | undefined = prev.fields?.[path]
				out.types![typeName].fields![path] = {
					read: both(before?.read, field.read)!,
					hidden: field.hidden,
				}
			}
			for (const op of ['read', 'create', 'update', 'delete'] as const) {
				if (out.types![typeName][op] === undefined) delete out.types![typeName][op]
			}
		}
		if (fragment.pushes) out.pushes = fragment.pushes
	}
	return out
}

/**
 * One rule from several: each runs in order and the first refusal wins, so later rules don't run.
 * Works for any rule shaped `(args) => refusal | null`, including a sync room's `authorize`.
 *
 * @example
 * ```ts
 * const comments = createCommentRule<MyRecord, SessionMeta>()
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	authorize: composeRules(createStructureRule(), comments.authorize, myPageRule),
 * })
 * ```
 *
 * @public
 */
export function composeRules<Args, Refusal>(
	...rules: ReadonlyArray<(args: Args) => Refusal | null>
): (args: Args) => Refusal | null {
	return (args) => {
		for (const rule of rules) {
			const refusal = rule(args)
			if (refusal) return refusal
		}
		return null
	}
}

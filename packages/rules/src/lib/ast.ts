/**
 * The rule language's syntax tree. It is plain JSON, so a compiled rule can be stored, sent over
 * the wire, diffed, and walked by analysis code. `s` is the `[start, end)` span of the node in the
 * rule's source text, so a denial can quote the exact clause that failed.
 *
 * @public
 */
export type TLRuleExpr =
	| { k: 'lit'; v: TLRuleJson; s: Span }
	| { k: 'ident'; name: string; s: Span }
	| { k: 'member'; obj: TLRuleExpr; prop: string; s: Span }
	| { k: 'index'; obj: TLRuleExpr; index: TLRuleExpr; s: Span }
	| { k: 'list'; items: TLRuleExpr[]; s: Span }
	| { k: 'unary'; op: '!' | '-'; arg: TLRuleExpr; s: Span }
	| { k: 'binary'; op: BinaryOp; left: TLRuleExpr; right: TLRuleExpr; s: Span }
	| { k: 'logical'; op: '&&' | '||'; left: TLRuleExpr; right: TLRuleExpr; s: Span }
	| { k: 'cond'; test: TLRuleExpr; then: TLRuleExpr; else: TLRuleExpr; s: Span }
	| { k: 'call'; fn: TLRuleFunctionName; args: TLRuleExpr[]; s: Span }
	| { k: 'quant'; q: 'some' | 'every'; list: TLRuleExpr; param: string; body: TLRuleExpr; s: Span }

/** @public */
export type Span = [start: number, end: number]

/** @public */
export type BinaryOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | '+' | '-' | 'in'

/** @public */
export type TLRuleJson =
	| null
	| boolean
	| number
	| string
	| TLRuleJson[]
	| { [key: string]: TLRuleJson }

/**
 * Every function a rule may call. The list is closed: a rule that calls anything else does not
 * compile. That is what keeps rules analyzable — each function's data dependencies are known.
 *
 * @public
 */
export const RULE_FUNCTIONS = {
	/** `get(id)`: another record in the room, or missing. */
	get: 1,
	/** `parent(r)`: `get(r.parentId)`. */
	parent: 1,
	/** `page(r)`: the page that holds `r` (by `parentId` chain, then `pageId`, then `currentPageId`). */
	page: 1,
	/** `ancestors(r)`: the `parentId` chain above `r`, nearest first, up to and including the page. */
	ancestors: 1,
	/** `changed('a.b', ...)`: true when any of the paths differs between `prev` and `next`. */
	changed: -1,
	/** `onlyChanged('a', 'b.c', ...)`: true when every changed leaf path is under one of these. */
	onlyChanged: -1,
	/** `exists(x)`: true when `x` is not null or missing. */
	exists: 1,
	/** `size(x)`: length of a list or string. */
	size: 1,
	/** `startsWith(s, prefix)` */
	startsWith: 2,
	/** `encode(s)`: `encodeURIComponent(s)`, for building canonical ids. */
	encode: 1,
	/** `can('action')`: the named action rule, for the current user. */
	can: 1,
	/** `canRead(r)`: `r`'s own read rule. */
	canRead: 1,
	/** `canEdit(r)`: `r`'s own update rule, asked as "may I touch it" (prev and next both `r`). */
	canEdit: 1,
} as const

/** @public */
export type TLRuleFunctionName = keyof typeof RULE_FUNCTIONS

/**
 * Names a rule may read. `record` is `next` for create and update and `prev` for delete and read.
 * `op` is `'create' | 'update' | 'delete' | 'read'`.
 *
 * @public
 */
export const RULE_ROOTS = ['user', 'prev', 'next', 'record', 'op'] as const

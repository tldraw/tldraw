import { registerTldrawLibraryVersion } from '@tldraw/utils'

export {
	RULE_FUNCTIONS,
	RULE_ROOTS,
	type BinaryOp,
	type Span,
	type TLRuleExpr,
	type TLRuleFunctionName,
	type TLRuleJson,
} from './lib/ast'
export { TLRuleSyntaxError, parseRule } from './lib/parse'
export {
	TLRules,
	TLRulesCompileError,
	compileRules,
	defineRules,
	type TLFieldRule,
	type TLReadDependencies,
	type TLRuleCheck,
	type TLRuleDecision,
	type TLRuleDenial,
	type TLRuleOp,
	type TLRuleRecord,
	type TLRuleSource,
	type TLRuleUser,
	type TLRulesDefinition,
	type TLTypeRules,
	type TLWriteInput,
	type TLWriteOp,
} from './lib/rules'
export { composeRules, type TLRulesFragment } from './lib/compose'
export { commentRules, userRecordRules } from './lib/presets'
export { pollPluginRules, useCaseRules } from './lib/use-cases'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)

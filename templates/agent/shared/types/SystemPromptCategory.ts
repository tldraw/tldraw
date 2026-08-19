/**
 * Categories used for deriving flags in getSystemPromptFlags.ts.
 *
 * These categories can be applied to actions (via _systemPromptCategory in .meta())
 *
 * If you like, you could extend the PromptPartDefinition interface to include a _systemPromptCategory field as well.
 */
export type SystemPromptCategory = 'edit' // Actions that modify shapes (used to derive `canEdit` flag)

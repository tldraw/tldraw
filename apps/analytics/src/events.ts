/**
 * Standardized event naming and custom dimensions for tldraw analytics
 *
 * Event Naming Convention:
 * - Use dot notation for namespacing: 'category.action' or 'category.subcategory.action'
 * - Use snake_case for all event names and properties
 * - Actions should be verbs in past tense: 'clicked', 'opened', 'created', 'exported'
 * - Be specific but concise: 'file.created' not 'create-file'
 *
 * Custom Dimensions:
 * - source: Where the action originated (required for all events)
 * - user_type: 'anonymous' | 'signed_in'
 * - app_context: 'docs' | 'dotcom' | 'vscode' | 'examples'
 */

export type TldrawEventSource =
	| 'toolbar'
	| 'menu'
	| 'kbd'
	| 'dialog'
	| 'context_menu'
	| 'top_bar'
	| 'file_share_menu'
	| 'new_page'
	| 'legacy_import_button'
	| 'hero'
	| 'pricing'
	| 'docs'
	| 'unknown'

export type UserType = 'anonymous' | 'signed_in'

export type AppContext = 'docs' | 'dotcom' | 'vscode' | 'examples'

export interface BaseEventProperties {
	source: TldrawEventSource
	user_type?: UserType
	app_context?: AppContext
	timestamp?: number
}

// Standard event definitions
export interface TldrawEvents {
	// Page/Navigation events
	'page.viewed': BaseEventProperties
	'url.opened': BaseEventProperties & { url: string }

	// File operations
	'file.created': BaseEventProperties
	'file.renamed': BaseEventProperties & { name: string }
	'file.downloaded': BaseEventProperties
	'file.shared': BaseEventProperties & { shared: boolean }
	'file.published': BaseEventProperties
	'file.unpublished': BaseEventProperties

	// Editor actions
	'editor.edit_started': BaseEventProperties
	'shapes.duplicated': BaseEventProperties
	'shapes.grouped': BaseEventProperties
	'shapes.ungrouped': BaseEventProperties
	'shapes.aligned': BaseEventProperties & { operation: string }

	// Export operations
	'content.exported': BaseEventProperties & { format: 'svg' | 'png' | 'json' }
	'content.copied': BaseEventProperties & { format: 'svg' | 'png' }

	// UI interactions
	'menu.opened': BaseEventProperties & { menu_id: string }
	'menu.closed': BaseEventProperties & { menu_id: string }
	'tool.selected': BaseEventProperties & { tool: string }
	'share_menu.tab_changed': BaseEventProperties & { tab: string }

	// Documentation specific
	'docs.code_copied': BaseEventProperties & { is_install: boolean }
	'docs.feedback_given': BaseEventProperties & { feedback: string }
	'docs.newsletter_signup': BaseEventProperties

	// Conversion tracking
	'conversion.signup_clicked': BaseEventProperties
	'conversion.pricing_clicked': BaseEventProperties & { tier: string }
	'conversion.demo_clicked': BaseEventProperties

	// Performance tracking
	'performance.room_load_duration': BaseEventProperties & {
		duration_ms: number
		room_size?: number
	}

	// Error tracking
	'error.room_size_limit': BaseEventProperties
	'error.room_size_warning': BaseEventProperties
}

export type TldrawEventName = keyof TldrawEvents
export type TldrawEventData<T extends TldrawEventName> = TldrawEvents[T]

/**
 * Get the current app context based on the environment
 */
export function getAppContext(): AppContext {
	if (typeof window === 'undefined') return 'unknown' as AppContext

	const hostname = window.location.hostname
	if (hostname.includes('tldraw.dev')) return 'docs'
	if (hostname.includes('tldraw.com')) return 'dotcom'
	if (hostname.includes('vscode')) return 'vscode'
	return 'dotcom' // default
}

/**
 * Get user type based on authentication state
 */
export function getUserType(): UserType {
	// This should be implemented based on your auth system
	// For now, return a placeholder
	return 'anonymous'
}

/**
 * Add standard custom dimensions to event data
 */
export function enrichEventData<T extends TldrawEventName>(
	eventName: T,
	data: TldrawEventData<T>
): TldrawEventData<T> & { app_context: AppContext; timestamp: number } {
	return {
		...data,
		app_context: data.app_context || getAppContext(),
		timestamp: Date.now(),
	}
}

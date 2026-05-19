// Shared types for gh-sync's provider-adapter architecture.
//
// A ProviderAdapter owns one external system (GitHub, Notion, HubSpot, …).
// It hydrates entities from that system onto the tldraw board, reacts to
// incoming external webhooks, and responds to the user manipulating its
// shapes on the canvas. Cross-provider arrows use addReference; within-provider
// arrows use addWithinProviderLink (e.g. GitHub sub-issues).

export interface Box {
	x: number
	y: number
	w: number
	h: number
}

/**
 * A single thing on the canvas that came from an external system.
 * Adapters extend this with provider-specific fields they need internally.
 */
export interface ExternalEntity {
	provider: string // 'github' | 'notion' | 'hubspot'
	externalId: string // e.g. `${owner}/${repo}#${number}` for GitHub
	shapeId: string // the tldraw shape that represents this entity
	box: Box
	title: string
	url: string
}

export interface TldrawShape {
	id: string
	type: string
	x: number
	y: number
	props: Record<string, unknown>
	meta?: Record<string, unknown>
}

/** Subset of incoming webhook envelope we pass to adapters. */
export interface IncomingWebhookContext {
	headers: Record<string, string | undefined>
	rawBody: string
	parsedBody: unknown
}

export interface ProviderAdapter<E extends ExternalEntity = ExternalEntity> {
	/** Stable string id, e.g. 'github'. */
	readonly providerId: string

	/** tldraw shape `type` field used for this provider's cards. */
	readonly shapeType: string

	// ---- Lifecycle ----

	/** Fetch from the external system and push shapes onto the board. */
	hydrate(): Promise<void>

	/** Delete all of this adapter's shapes and re-hydrate. */
	resync(): Promise<void>

	/** Returns shape ids the adapter owns — used by global resync to wipe state. */
	ownedShapeIds(): string[]

	/** Set up webhook subscriptions on the external system (no-op if none). */
	registerOutgoingWebhooks?(publicUrl: string): Promise<void>

	// ---- Incoming webhook reception ----

	/** Quick predicate so the server can route by headers without parsing. */
	matchesIncomingWebhook(ctx: IncomingWebhookContext): boolean

	/** Process an incoming webhook delivery from the external system. */
	handleIncomingWebhook(ctx: IncomingWebhookContext): Promise<void>

	// ---- Shape/entity lookup ----

	entityForShapeId(shapeId: string): E | null

	// ---- User-driven canvas updates ----

	/** Called when one of this adapter's shapes changes on the board. */
	handleShapeUpdated?(shape: TldrawShape): Promise<void>

	// ---- Cross-provider arrows ----

	/** Write a one-way reference from `self` to `other` (external system). */
	addReference?(self: E, other: ExternalEntity): Promise<void>
	/** Undo a previously written reference. */
	removeReference?(self: E, other: ExternalEntity): Promise<void>

	// ---- Within-provider arrows ----

	/** Native parent/child within the same provider (e.g. github sub-issues). */
	addWithinProviderLink?(parent: E, child: E): Promise<void>
	removeWithinProviderLink?(parent: E, child: E): Promise<void>
}

/// <reference types="@cloudflare/workers-types" />

export interface Environment {
	// Analytics Engine bindings are unavailable in local dev, so this is optional and every write
	// site tolerates it being undefined.
	TAIL: AnalyticsEngineDataset | undefined

	// Cross-script binding onto the sync worker's own TLDR_DOC namespace (staging and production
	// only — see wrangler.toml). Used only to convert a slug to its durable object id via
	// idFromName, never to open a room, so every call site must tolerate this being undefined.
	TLDR_DOC: DurableObjectNamespace | undefined

	TLDRAW_ENV: string

	GRAFANA_LOKI_ENDPOINT: string
	GRAFANA_LOKI_USER: string
	GRAFANA_LOKI_TOKEN: string
}

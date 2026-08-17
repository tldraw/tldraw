/// <reference types="@cloudflare/workers-types" />

export interface Environment {
	// Analytics Engine bindings are unavailable in local dev, so this is optional and every write
	// site tolerates it being undefined.
	TAIL: AnalyticsEngineDataset | undefined

	TLDRAW_ENV: string

	GRAFANA_LOKI_ENDPOINT: string
	GRAFANA_LOKI_USER: string
	GRAFANA_LOKI_TOKEN: string
}

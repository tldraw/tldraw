/// <reference types="@cloudflare/workers-types" />
export interface Environment {
	TLDRAW_BUCKET: R2Bucket
	TLDRAW_DURABLE_OBJECT: DurableObjectNamespace
}

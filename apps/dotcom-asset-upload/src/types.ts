export interface Env {
	UPLOADS: R2Bucket

	KV: KVNamespace
	ASSET_UPLOADER_AUTH_TOKEN: string | undefined
}

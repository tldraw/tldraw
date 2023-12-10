/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_ASSISTANT_ID: string
	readonly VITE_THREAD_ID: string
	readonly VITE_OPENAI_API_KEY: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		plugins: [
			cloudflare(),
			react(
				/* EXCLUDE_FROM_TEMPLATE_EXPORT_START */
				{ tsDecorators: true }
				/* EXCLUDE_FROM_TEMPLATE_EXPORT_END */
			),
		],
		resolve: {
			alias: {
				// Only load English locale instead of all 47 locales to reduce bundle size
				'zod/v4/locales/index.js': new URL('./zod-locales-shim.js', import.meta.url).pathname,
			},
		},
	}
})

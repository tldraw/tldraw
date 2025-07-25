import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(
			/* EXCLUDE_FROM_TEMPLATE_EXPORT_START */
			{ tsDecorators: true }
			/* EXCLUDE_FROM_TEMPLATE_EXPORT_END */
		),
	],
})

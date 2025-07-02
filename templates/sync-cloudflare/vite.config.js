import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
	var _b
	var mode = _a.mode
	if (mode === 'production' && !process.env.TLDRAW_WORKER_URL) {
		throw new Error('TLDRAW_WORKER_URL must be set in production')
	}
	return {
		plugins: [react()],
		define: {
			'process.env.TLDRAW_WORKER_URL':
				(_b = process.env.TLDRAW_WORKER_URL) !== null && _b !== void 0
					? _b
					: '`http://${location.hostname}:5172`',
		},
	}
})

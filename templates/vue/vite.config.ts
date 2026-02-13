import react from '@vitejs/plugin-react-swc'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react({ tsDecorators: true }), vue(), vueDevTools()],
})

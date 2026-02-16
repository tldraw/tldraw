import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
export default defineConfig({
    plugins: [
        react({
            tsDecorators: true,
        }),
    ],
    optimizeDeps: {
        exclude: ['@google/generative-ai'],
    },
});

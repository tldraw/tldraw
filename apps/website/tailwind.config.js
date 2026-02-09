/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['var(--font-geist-sans)'],
				mono: [
					'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
				],
			},
			colors: {
				brand: {
					blue: '#2F80ED',
					yellow: '#FFD700',
				},
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
}

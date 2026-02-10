/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['var(--font-archivo)', 'Archivo', 'sans-serif'],
				mono: ['var(--font-geist-mono)', 'Geist Mono', 'Fragment Mono', 'monospace'],
			},
			colors: {
				brand: {
					blue: '#155DFC',
				},
				body: '#404047',
			},
			letterSpacing: {
				heading: '-0.02em',
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
}

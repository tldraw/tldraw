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
					link: '#155DFC',
				},
				body: '#27272a' /* zinc-800 - darker for readability */,
			},
			letterSpacing: {
				heading: '-0.02em',
			},
			maxWidth: {
				content: '1088px',
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
}

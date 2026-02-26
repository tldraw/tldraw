import { TLDefaultFont, TLFontFace } from 'tldraw'

// NOTE: these fonts only support the latin character set. To support other languages, you'll add
// each one as a new font-family, similar to how you would with @font-face.
export const extensionFontFamilies: {
	[key: string]: { [key: string]: { [key: string]: TLFontFace } }
} = {
	Inter: {
		normal: {
			normal: {
				family: 'Inter',
				src: {
					url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2',
					format: 'woff2',
				},
				weight: '500',
				style: 'normal',
			},
			bold: {
				family: 'Inter',
				src: {
					url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2',
					format: 'woff2',
				},
				weight: '700',
				style: 'normal',
			},
		},
		italic: {
			normal: {
				family: 'Inter',
				src: {
					url: 'https://fonts.gstatic.com/s/inter/v18/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc69tRipWFsevceSGM.woff2',
					format: 'woff2',
				},
				weight: '500',
				style: 'normal',
			},
			bold: {
				family: 'Inter',
				src: {
					url: 'https://fonts.gstatic.com/s/inter/v18/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxRipWFsevceSGM.woff2',
					format: 'woff2',
				},
				weight: '700',
				style: 'normal',
			},
		},
	},
	"'Exo 2'": {
		normal: {
			normal: {
				family: 'Exo 2',
				src: {
					url: 'https://fonts.gstatic.com/s/exo2/v24/7cH1v4okm5zmbvwkAx_sfcEuiD8jjPKsOdC_jJ7bpAhL.woff2',
					format: 'woff2',
				},
				weight: '500',
				style: 'normal',
			},
			bold: {
				family: 'Exo 2',
				src: {
					url: 'https://fonts.gstatic.com/s/exo2/v24/7cH1v4okm5zmbvwkAx_sfcEuiD8jWfWsOdC_jJ7bpAhL.woff2',
					format: 'woff2',
				},
				weight: '700',
				style: 'normal',
			},
		},
		italic: {
			normal: {
				family: 'Exo 2',
				src: {
					url: 'https://fonts.gstatic.com/s/exo2/v24/7cH3v4okm5zmbtYtMeA0FKq0Jjg2drFGfeC9hp_5oBBKRrs.woff2',
					format: 'woff2',
				},
				weight: '500',
				style: 'normal',
			},
			bold: {
				family: 'Exo 2',
				src: {
					url: 'https://fonts.gstatic.com/s/exo2/v24/7cH3v4okm5zmbtYtMeA0FKq0Jjg2drGTeuC9hp_5oBBKRrs.woff2',
					format: 'woff2',
				},
				weight: '700',
				style: 'normal',
			},
		},
	},
} satisfies Record<string, TLDefaultFont>

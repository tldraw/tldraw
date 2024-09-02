import { parseCss, parseCssFontFamilyValue } from './parseCss'

test('parseCss', () => {
	expect(parseCss(``, 'https://example.com')).toMatchInlineSnapshot(`
		{
		  "fontFaces": [],
		  "imports": [],
		}
	`)

	expect(
		parseCss(
			`
				body {
					color: red;
					background-image: url('https://example.com/image.jpg');
				}
			`,
			'https://example.com'
		)
	).toMatchInlineSnapshot(`
		{
		  "fontFaces": [],
		  "imports": [],
		}
	`)

	expect(
		parseCss(
			`
				@import url('https://example.com/font.css');

				@font-face {
					font-family: 'Inter';
					font-style: normal;
					font-weight: 500;
					font-display: swap;
					src:
						url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0Q5n-wU.woff2)
						url("local.other")
						format('woff2');
					unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
				}

				@import url ( "thing.css" ) screen and (min-width: 900px);
				@import 'test.css' screen and (min-width: 900px);

				body {
					color: red;
					background-image: url('https://example.com/image.jpg');
				}

				@font-face {
					font-family: "Inter";
					font-style: normal;
					font-weight: 500;
					font-display: swap;
					src: url('my-font.woff2') format('woff2');
					unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
					font-family: "Inter2";
					font-family: Inter3;
					font-family: 'Inter3'
				}
			`,
			'https://example.com'
		)
	).toMatchInlineSnapshot(`
		{
		  "fontFaces": [
		    {
		      "fontFace": "
							font-family: 'Inter';
							font-style: normal;
							font-weight: 500;
							font-display: swap;
							src:
								url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0Q5n-wU.woff2)
								url("local.other")
								format('woff2');
							unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
						",
		      "fontFamilies": Set {
		        "inter",
		      },
		      "urls": [
		        {
		          "original": "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0Q5n-wU.woff2",
		          "resolved": "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0Q5n-wU.woff2",
		        },
		        {
		          "original": "local.other",
		          "resolved": "https://example.com/local.other",
		        },
		      ],
		    },
		    {
		      "fontFace": "
							font-family: "Inter";
							font-style: normal;
							font-weight: 500;
							font-display: swap;
							src: url('my-font.woff2') format('woff2');
							unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
							font-family: "Inter2";
							font-family: Inter3;
							font-family: 'Inter3'
						",
		      "fontFamilies": Set {
		        "inter",
		        "inter2",
		        "inter3",
		      },
		      "urls": [
		        {
		          "original": "my-font.woff2",
		          "resolved": "https://example.com/my-font.woff2",
		        },
		      ],
		    },
		  ],
		  "imports": [
		    {
		      "extras": " screen and (min-width: 900px)",
		      "url": "thing.css",
		    },
		    {
		      "extras": " screen and (min-width: 900px)",
		      "url": "test.css",
		    },
		  ],
		}
	`)
})

test('parseCssFontFamilyValue', () => {
	expect(parseCssFontFamilyValue('Inter')).toMatchInlineSnapshot(`
		Set {
		  "inter",
		}
	`)
	expect(
		parseCssFontFamilyValue(
			`"Goudy Bookletter 1911", "I have, 'stuff'", Georgia, 'Lucida Console', sans-serif`
		)
	).toMatchInlineSnapshot(`
		Set {
		  "goudy bookletter 1911",
		  "i have, 'stuff'",
		  "georgia",
		  "lucida console",
		  "sans-serif",
		}
	`)
})

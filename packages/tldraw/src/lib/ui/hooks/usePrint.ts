import { assert, tlenv, uniqueId, useMaybeEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'

/** @internal */
export function usePrint() {
	const editor = useMaybeEditor()
	const prevPrintEl = useRef<HTMLDivElement | null>(null)
	const prevStyleEl = useRef<HTMLStyleElement | null>(null)

	return useCallback(
		async function printSelectionOrPages() {
			assert(editor, 'usePrint: editor is required')
			const el = document.createElement('div')
			const style = document.createElement('style')

			// todo: why are these using a ref? this seems like it could be a function rather than a hook
			const clearElements = (printEl: HTMLDivElement | null, styleEl: HTMLStyleElement | null) => {
				if (printEl) printEl.innerHTML = ''
				if (styleEl && document.head.contains(styleEl)) document.head.removeChild(styleEl)
				if (printEl && document.body.contains(printEl)) {
					document.body.removeChild(printEl)
				}
			}

			// Always make sure we have a clean root element.
			clearElements(prevPrintEl.current, prevStyleEl.current)
			prevPrintEl.current = el
			prevStyleEl.current = style

			// Random because this isn't for end users
			const className = `tl-print-surface-${uniqueId()}`

			el.className = className
			// NOTE: Works in most envs except safari, needs further review
			const enableMargins = false
			// NOTE: Currently buggy needs further investigation
			const allowAllPages = false
			style.innerHTML = `
			.${className} {
				display: none;
			}

			.${className} svg {
				max-width: 100%;
				height: 100%;
				display: block;
			}

			@media print {				  
				html, body {
					min-height: 100%;
					height: 100%;
					margin: 0;
				}

				body {
					position: relative;
				}

				body > * {
					display: none;
				}

				.tldraw__editor {
					display: none;
				}

				.${className} {
					display: block !important;
					background: white;
					min-height: 100%;
					height: 100%;
					max-width: 100%;
				}

				.${className}__item {
					padding: 10mm;
					display: flex;
					min-height: 100%;
					flex-direction: column;
					page-break-after: always;
					position: relative;
					overflow: hidden;
					height: 100%;
				}

				.${className}__item__main {
					flex: 1;
					display: flex;
					align-items: center;
					justify-content: center;
					max-height: 100%;
				}

				.${className}__item__header {
					display: none;
				}

				.${className}__item__footer {
					display: none;
					text-align: right;
				}

				.${className}__item__footer__hide {
					display: none;
				}

				${
					!enableMargins
						? ''
						: `
					/**
					 * Note: Safari doesn't support removing the page margins to remove them all!
					 */
					@page {
						margin:0;
					}

					.${className} .${className}__item__header {
						display: block;
					}

					.${className} .${className}__item__footer {
						display: block;
					}
				`
				}
			}

		`

			const beforePrintHandler = () => {
				document.head.appendChild(style)
				document.body.appendChild(el)
			}

			const afterPrintHandler = () => {
				editor.once('tick', () => {
					clearElements(el, style)
				})
			}

			window.addEventListener('beforeprint', beforePrintHandler)
			window.addEventListener('afterprint', afterPrintHandler)

			function addPageToPrint(title: string, footer: string | null, svg: string) {
				try {
					el.innerHTML += `<div class="${className}__item">
        <div class="${className}__item__header">
          ${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        <div class="${className}__item__main">
          ${svg}
        </div>
        <div class="${className}__item__footer ${className}__item__footer__${footer ? '' : 'hide'}">
          ${footer ?? ''}
        </div>
      </div>`
				} catch (e) {
					console.error(e)
				}
			}

			function triggerPrint() {
				if (tlenv.isChromeForIos) {
					beforePrintHandler()
					window.print()
				} else if (tlenv.isSafari) {
					beforePrintHandler()
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					document.execCommand('print', false)
				} else {
					window.print()
				}
			}

			const selectedShapeIds = editor.getSelectedShapeIds()
			const currentPageId = editor.getCurrentPageId()
			const pages = editor.getPages()

			const preserveAspectRatio = 'xMidYMid meet'

			const svgOpts = {
				scale: 1,
				background: false,
				darkMode: false,
				preserveAspectRatio,
			}

			if (editor.getSelectedShapeIds().length > 0) {
				// Print the selected ids from the current page
				const svgExport = await editor.getSvgString(selectedShapeIds, svgOpts)

				if (svgExport) {
					const page = pages.find((p) => p.id === currentPageId)
					addPageToPrint(`tldraw — ${page?.name}`, null, svgExport.svg)
					triggerPrint()
				}
			} else {
				if (allowAllPages) {
					// Print all pages
					for (let i = 0; i < pages.length; i++) {
						const page = pages[i]
						const svgExport = await editor.getSvgString(
							editor.getSortedChildIdsForParent(page.id),
							svgOpts
						)
						if (svgExport) {
							addPageToPrint(`tldraw — ${page.name}`, `${i}/${pages.length}`, svgExport.svg)
						}
					}
					triggerPrint()
				} else {
					const page = editor.getCurrentPage()
					const svgExport = await editor.getSvgString(
						editor.getSortedChildIdsForParent(page.id),
						svgOpts
					)
					if (svgExport) {
						addPageToPrint(`tldraw — ${page.name}`, null, svgExport.svg)
						triggerPrint()
					}
				}
			}

			window.removeEventListener('beforeprint', beforePrintHandler)
			window.removeEventListener('afterprint', afterPrintHandler)
		},
		[editor]
	)
}

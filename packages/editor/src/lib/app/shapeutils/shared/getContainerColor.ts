import { TLColorType } from '@tldraw/tlschema'

let containerStyle: CSSStyleDeclaration | null = null
let timeout: any = -1

export function getColorForSvgExport(
	opts:
		| { type: 'text' | 'background' | 'solid'; isDarkMode: boolean }
		| { type: 'fill' | 'pattern' | 'semi'; color: TLColorType; isDarkMode: boolean }
): string {
	// Ok, we don't want to be computing all the styles all the time,
	// so let's cache the computed styles for a second. If the dark
	// mode changes during this time then we'll just have to live with it.
	if (containerStyle === null) {
		const fakeContainerEl = document.createElement('div')
		fakeContainerEl.className = `tl-container tl-theme__${opts.isDarkMode ? 'dark' : 'light'}`
		document.body.appendChild(fakeContainerEl)
		containerStyle = getComputedStyle(fakeContainerEl)

		if (timeout !== -1) clearTimeout(timeout)
		timeout = setTimeout(() => {
			document.body.removeChild(fakeContainerEl)
			containerStyle = null
		}, 1000)
	}

	let style: string

	switch (opts.type) {
		case 'fill': {
			style = containerStyle.getPropertyValue(`--palette-${opts.color}`)
			break
		}
		case 'pattern': {
			style = containerStyle.getPropertyValue(`--palette-${opts.color}-pattern`)
			break
		}
		case 'semi': {
			style = containerStyle.getPropertyValue(`--palette-${opts.color}-semi`)
			break
		}
		case 'solid': {
			style = containerStyle.getPropertyValue(`--palette-solid`)
			break
		}
		case 'text': {
			style = containerStyle.getPropertyValue(`--color-text`)
			break
		}
		case 'background': {
			style = containerStyle.getPropertyValue(`--color-background`)
			break
		}
	}

	return style
}

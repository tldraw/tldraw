import { T, Tldraw } from 'tldraw'
import { SizeStyleUtil } from 'tldraw/src/lib/styles/TLSizeStyle'

// Create a custom size style util with different sizes
class CustomSizeStyleUtil extends SizeStyleUtil<'s' | 'm' | 'l' | 'xl'> {
	static validator = T.literalEnum('s', 'm', 'l', 'xl')

	getDefaultValue(): 's' | 'm' | 'l' | 'xl' {
		return 'm'
	}

	toStrokeSizePx(value: 's' | 'm' | 'l' | 'xl'): number {
		switch (value) {
			case 's':
				return 1
			case 'm':
				return 2
			case 'l':
				return 4
			case 'xl':
				return 8
		}
	}

	toFontSizePx(value: 's' | 'm' | 'l' | 'xl'): number {
		switch (value) {
			case 's':
				return 12
			case 'm':
				return 16
			case 'l':
				return 20
			case 'xl':
				return 24
		}
	}

	toLabelFontSizePx(value: 's' | 'm' | 'l' | 'xl'): number {
		return this.toFontSizePx(value)
	}
}

const styleUtils = [CustomSizeStyleUtil]

export default function StrokeAndFontSizesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw styleUtils={styleUtils} />
		</div>
	)
}

import {
	createShapeId,
	DefaultColorStyle,
	DefaultColorThemes,
	extendDefaultColorTheme,
	getColorValue,
	getDefaultColorTheme,
	isDefaultThemeColor,
	TLDrawShape,
	TLGeoShape,
	TLTextShape,
	toRichText,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const themes = { ...DefaultColorThemes.get() }

describe('Custom Colors', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
		extendDefaultColorTheme(() => ({ ...themes }))
	})

	describe('Creating shapes with enumerated colors', () => {
		test('should create a shape with red color and apply correct theme values', () => {
			const shapeId = createShapeId('red-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'red',
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('red')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })
			expect(lightTheme.colors.red.solid).toBe('#e03131')
			expect(darkTheme.colors.red.solid).toBe('#e03131')
		})

		test('should create a shape with blue color and apply correct theme values', () => {
			const shapeId = createShapeId('blue-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'blue',
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('blue')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })
			expect(lightTheme.colors.blue.solid).toBe('#4465e9')
			expect(darkTheme.colors.blue.solid).toBe('#4f72fc')
		})

		test('should create a shape with black color and apply correct theme values', () => {
			const shapeId = createShapeId('black-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'black',
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('black')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })
			expect(lightTheme.colors.black.solid).toBe('#1d1d1d')
			expect(darkTheme.colors.black.solid).toBe('#f2f2f2')
		})

		test('should handle all default color names correctly', () => {
			const defaultColors = [
				'black',
				'grey',
				'light-violet',
				'violet',
				'blue',
				'light-blue',
				'yellow',
				'orange',
				'green',
				'light-green',
				'light-red',
				'red',
				'white',
			]

			defaultColors.forEach((color, index) => {
				const shapeId = createShapeId(`shape-${color}`)
				editor.createShapes([
					{
						id: shapeId,
						type: 'geo',
						x: index * 10,
						y: 0,
						props: {
							color,
							w: 50,
							h: 50,
						},
					},
				])

				const shape = editor.getShape<TLGeoShape>(shapeId)!
				expect(shape.props.color).toBe(color)

				const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
				expect(lightTheme.colors[color]).toBeDefined()
				expect(lightTheme.colors[color].solid).toMatch(/^#[0-9a-fA-F]{6}$/)
			})
		})
	})

	describe('Creating shapes with arbitrary colors', () => {
		test('should create a shape with hex color #000CCC and use it directly', () => {
			const shapeId = createShapeId('hex-shape')
			const hexColor = '#000CCC'
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: hexColor,
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe(hexColor)

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, hexColor)).toBe(hexColor)
			expect(getColorValue(lightTheme, hexColor, 'solid')).toBe(hexColor)
		})

		test('should create a shape with HSL color and use it directly', () => {
			const shapeId = createShapeId('hsl-shape')
			const hslColor = 'hsl(240, 100%, 40%)'
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: hslColor,
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe(hslColor)

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, hslColor)).toBe(hslColor)
		})

		test('should create a shape with RGB color and use it directly', () => {
			const shapeId = createShapeId('rgb-shape')
			const rgbColor = 'rgb(255, 128, 0)'
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: rgbColor,
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe(rgbColor)

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, rgbColor)).toBe(rgbColor)
		})

		test('should create a shape with named CSS color and use it directly', () => {
			const shapeId = createShapeId('css-shape')
			const cssColor = 'darkturquoise'
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: cssColor,
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe(cssColor)

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, cssColor)).toBe(cssColor)
		})

		test('should handle invalid color strings gracefully', () => {
			const shapeId = createShapeId('invalid-shape')
			const invalidColor = 'not-a-color'
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: invalidColor,
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe(invalidColor)

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, invalidColor)).toBe(invalidColor)
		})
	})

	describe('Theme extension', () => {
		afterEach(() => {
			DefaultColorThemes.update(() => ({
				light: {
					id: 'light',
					text: '#000000',
					background: '#f9fafb',
					solid: '#fcfffe',
					colors: {
						black: {
							solid: '#1d1d1d',
							fill: '#1d1d1d',
							frameHeadingStroke: '#717171',
							frameHeadingFill: '#ffffff',
							frameStroke: '#717171',
							frameFill: '#ffffff',
							frameText: '#000000',
							noteFill: '#FCE19C',
							noteText: '#000000',
							semi: '#e8e8e8',
							pattern: '#494949',
							highlightSrgb: '#fddd00',
							highlightP3: 'color(display-p3 0.972 0.8205 0.05)',
						},
						red: {
							solid: '#e03131',
							fill: '#e03131',
							frameHeadingStroke: '#e55757',
							frameHeadingFill: '#fef7f7',
							frameStroke: '#e55757',
							frameFill: '#fef9f9',
							frameText: '#000000',
							noteFill: '#FC8282',
							noteText: '#000000',
							semi: '#f4dadb',
							pattern: '#e55959',
							highlightSrgb: '#ff636e',
							highlightP3: 'color(display-p3 0.9992 0.4376 0.45)',
						},
					},
				},
				dark: {
					id: 'dark',
					text: 'hsl(210, 17%, 98%)',
					background: 'hsl(240, 5%, 6.5%)',
					solid: '#010403',
					colors: {
						black: {
							solid: '#f2f2f2',
							fill: '#f2f2f2',
							frameHeadingStroke: '#5c5c5c',
							frameHeadingFill: '#252525',
							frameStroke: '#5c5c5c',
							frameFill: '#0c0c0c',
							frameText: '#f2f2f2',
							noteFill: '#2c2c2c',
							noteText: '#f2f2f2',
							semi: '#2c3036',
							pattern: '#989898',
							highlightSrgb: '#d2b700',
							highlightP3: 'color(display-p3 0.8078 0.6225 0.0312)',
						},
						red: {
							solid: '#e03131',
							fill: '#e03131',
							frameHeadingStroke: '#701e1e',
							frameHeadingFill: '#301616',
							frameStroke: '#701e1e',
							frameFill: '#1b1313',
							frameText: '#f2f2f2',
							noteFill: '#7e201f',
							noteText: '#f2f2f2',
							semi: '#382726',
							pattern: '#8f3734',
							highlightSrgb: '#de002c',
							highlightP3: 'color(display-p3 0.7978 0.0509 0.2035)',
						},
					},
				},
			}))
		})

		test('should extend theme with new custom color', () => {
			const customColor = {
				solid: '#8B5CF6',
				fill: '#8B5CF6',
				frameHeadingStroke: '#7C3AED',
				frameHeadingFill: '#F3F4F6',
				frameStroke: '#7C3AED',
				frameFill: '#F9FAFB',
				frameText: '#000000',
				noteFill: '#DDD6FE',
				noteText: '#000000',
				semi: '#EDE9FE',
				pattern: '#A78BFA',
				highlightSrgb: '#C4B5FD',
				highlightP3: 'color(display-p3 0.769 0.710 0.992)',
			}

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						custom: customColor,
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						custom: { ...customColor, solid: '#A855F7' },
					},
				},
			}))

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })

			expect(lightTheme.colors.custom).toEqual(customColor)
			expect(darkTheme.colors.custom.solid).toBe('#A855F7')
			expect(isDefaultThemeColor('custom')).toBe(true)
		})

		test('should modify existing color values in theme', () => {
			const originalLightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const originalRedSolid = originalLightTheme.colors.red.solid

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						red: {
							...themes.light.colors.red,
							solid: '#FF0000',
						},
					},
				},
			}))

			const updatedTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(updatedTheme.colors.red.solid).toBe('#FF0000')
			expect(updatedTheme.colors.red.solid).not.toBe(originalRedSolid)
		})

		test('should maintain theme consistency across light and dark modes', () => {
			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						consistent: {
							solid: '#FF6B35',
							fill: '#FF6B35',
							frameHeadingStroke: '#E55A2B',
							frameHeadingFill: '#FFF5F2',
							frameStroke: '#E55A2B',
							frameFill: '#FFF8F5',
							frameText: '#000000',
							noteFill: '#FFB199',
							noteText: '#000000',
							semi: '#FFE1D6',
							pattern: '#FF8A66',
							highlightSrgb: '#FF9F80',
							highlightP3: 'color(display-p3 0.996 0.624 0.502)',
						},
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						consistent: {
							solid: '#FF8C66',
							fill: '#FF8C66',
							frameHeadingStroke: '#B8421F',
							frameHeadingFill: '#2A1813',
							frameStroke: '#B8421F',
							frameFill: '#1C110E',
							frameText: '#F2F2F2',
							noteFill: '#A03A18',
							noteText: '#F2F2F2',
							semi: '#3A2B27',
							pattern: '#CC6B47',
							highlightSrgb: '#E55A2B',
							highlightP3: 'color(display-p3 0.894 0.353 0.171)',
						},
					},
				},
			}))

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })

			expect(lightTheme.colors.consistent).toBeDefined()
			expect(darkTheme.colors.consistent).toBeDefined()
			expect(Object.keys(lightTheme.colors.consistent)).toEqual(
				Object.keys(darkTheme.colors.consistent)
			)
		})

		test('should throw error when themes have mismatched colors', () => {
			expect(() => {
				extendDefaultColorTheme((themes) => ({
					...themes,
					light: {
						...themes.light,
						colors: {
							...themes.light.colors,
							mismatched: {
								solid: '#FF0000',
								fill: '#FF0000',
								frameHeadingStroke: '#CC0000',
								frameHeadingFill: '#FFF5F5',
								frameStroke: '#CC0000',
								frameFill: '#FFF8F8',
								frameText: '#000000',
								noteFill: '#FFB3B3',
								noteText: '#000000',
								semi: '#FFE0E0',
								pattern: '#FF6666',
								highlightSrgb: '#FF9999',
								highlightP3: 'color(display-p3 0.996 0.6 0.6)',
							},
						},
					},
				}))
			}).toThrow('Theme dark is missing color mismatched')
		})

		test('should update color names set after extension', () => {
			expect(isDefaultThemeColor('newcolor')).toBe(false)

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						newcolor: {
							solid: '#00FF00',
							fill: '#00FF00',
							frameHeadingStroke: '#00CC00',
							frameHeadingFill: '#F5FFF5',
							frameStroke: '#00CC00',
							frameFill: '#F8FFF8',
							frameText: '#000000',
							noteFill: '#B3FFB3',
							noteText: '#000000',
							semi: '#E0FFE0',
							pattern: '#66FF66',
							highlightSrgb: '#99FF99',
							highlightP3: 'color(display-p3 0.6 0.996 0.6)',
						},
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						newcolor: {
							solid: '#00DD00',
							fill: '#00DD00',
							frameHeadingStroke: '#007700',
							frameHeadingFill: '#0F2A0F',
							frameStroke: '#007700',
							frameFill: '#0A1C0A',
							frameText: '#F2F2F2',
							noteFill: '#004400',
							noteText: '#F2F2F2',
							semi: '#273A27',
							pattern: '#4DCC4D',
							highlightSrgb: '#00AA00',
							highlightP3: 'color(display-p3 0.27 0.67 0.02)',
						},
					},
				},
			}))

			expect(isDefaultThemeColor('newcolor')).toBe(true)
		})

		test('should update style values after extension', () => {
			const originalValues = [...DefaultColorStyle.values]

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						styletest: {
							solid: '#FF00FF',
							fill: '#FF00FF',
							frameHeadingStroke: '#CC00CC',
							frameHeadingFill: '#FFF5FF',
							frameStroke: '#CC00CC',
							frameFill: '#FFF8FF',
							frameText: '#000000',
							noteFill: '#FFB3FF',
							noteText: '#000000',
							semi: '#FFE0FF',
							pattern: '#FF66FF',
							highlightSrgb: '#FF99FF',
							highlightP3: 'color(display-p3 0.996 0.6 0.996)',
						},
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						styletest: {
							solid: '#EE00EE',
							fill: '#EE00EE',
							frameHeadingStroke: '#880088',
							frameHeadingFill: '#2A0F2A',
							frameStroke: '#880088',
							frameFill: '#1C0A1C',
							frameText: '#F2F2F2',
							noteFill: '#440044',
							noteText: '#F2F2F2',
							semi: '#3A273A',
							pattern: '#CC4DCC',
							highlightSrgb: '#AA00AA',
							highlightP3: 'color(display-p3 0.67 0.02 0.67)',
						},
					},
				},
			}))

			expect(DefaultColorStyle.values).toContain('styletest')
			expect(DefaultColorStyle.values.length).toBeGreaterThan(originalValues.length)
		})
	})

	describe('getColorValue helper function', () => {
		test('should return theme color variant for enumerated colors', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })

			expect(getColorValue(lightTheme, 'red', 'solid')).toBe('#e03131')
			expect(getColorValue(lightTheme, 'red', 'semi')).toBe('#f4dadb')
			expect(getColorValue(lightTheme, 'red', 'pattern')).toBe('#e55959')
			expect(getColorValue(lightTheme, 'red', 'fill')).toBe('#e03131')

			expect(getColorValue(darkTheme, 'red', 'solid')).toBe('#e03131')
			expect(getColorValue(darkTheme, 'red', 'semi')).toBe('#382726')
			expect(getColorValue(darkTheme, 'blue', 'solid')).toBe('#4f72fc')
		})

		test('should return solid variant when no variant specified for enumerated colors', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })

			expect(getColorValue(lightTheme, 'red')).toBe('#e03131')
			expect(getColorValue(lightTheme, 'blue')).toBe('#4465e9')
			expect(getColorValue(lightTheme, 'black')).toBe('#1d1d1d')

			expect(getColorValue(darkTheme, 'red')).toBe('#e03131')
			expect(getColorValue(darkTheme, 'blue')).toBe('#4f72fc')
			expect(getColorValue(darkTheme, 'black')).toBe('#f2f2f2')
		})

		test('should return color directly for arbitrary color strings', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const darkTheme = getDefaultColorTheme({ colorScheme: 'dark' })

			const arbitraryColors = [
				'#FF5733',
				'rgb(255, 87, 51)',
				'hsl(9, 100%, 60%)',
				'rgba(255, 87, 51, 0.8)',
				'hsla(9, 100%, 60%, 0.8)',
				'darkturquoise',
				'transparent',
			]

			arbitraryColors.forEach((color) => {
				expect(getColorValue(lightTheme, color)).toBe(color)
				expect(getColorValue(lightTheme, color, 'solid')).toBe(color)
				expect(getColorValue(lightTheme, color, 'fill')).toBe(color)
				expect(getColorValue(darkTheme, color)).toBe(color)
				expect(getColorValue(darkTheme, color, 'pattern')).toBe(color)
			})
		})

		test('should handle undefined variant gracefully', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })

			expect(getColorValue(lightTheme, 'red', undefined)).toBe('#e03131')
			expect(getColorValue(lightTheme, 'blue', undefined)).toBe('#4465e9')
			expect(getColorValue(lightTheme, '#FF5733', undefined)).toBe('#FF5733')
		})

		test('should work with all color variants (solid, fill, pattern, etc.)', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const variants = [
				'solid',
				'fill',
				'semi',
				'pattern',
				'frameHeadingStroke',
				'frameHeadingFill',
				'frameStroke',
				'frameFill',
				'frameText',
				'noteFill',
				'noteText',
				'highlightSrgb',
				'highlightP3',
			] as const

			variants.forEach((variant) => {
				const result = getColorValue(lightTheme, 'red', variant)
				expect(typeof result).toBe('string')
				expect(result).toBe(lightTheme.colors.red[variant])
			})
		})

		test('should handle edge cases with invalid color names', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })

			expect(getColorValue(lightTheme, 'nonexistent')).toBe('nonexistent')
			expect(getColorValue(lightTheme, 'nonexistent', 'solid')).toBe('nonexistent')
			expect(getColorValue(lightTheme, '')).toBe('')
			expect(getColorValue(lightTheme, null as any)).toBe(null)
			expect(getColorValue(lightTheme, undefined as any)).toBe(undefined)
		})

		test('should maintain type safety for color variants', () => {
			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })

			const solidColor = getColorValue(lightTheme, 'red', 'solid')
			const fillColor = getColorValue(lightTheme, 'red', 'fill')
			const arbitraryColor = getColorValue(lightTheme, '#123456', 'solid')

			expect(typeof solidColor).toBe('string')
			expect(typeof fillColor).toBe('string')
			expect(typeof arbitraryColor).toBe('string')

			expect(solidColor).toMatch(/^#[0-9a-fA-F]{6}$/)
			expect(fillColor).toMatch(/^#[0-9a-fA-F]{6}$/)
			expect(arbitraryColor).toBe('#123456')
		})
	})

	describe('Integration scenarios', () => {
		test('should create multiple shapes with mixed color types', () => {
			const shapes = [
				{
					id: createShapeId('enum-shape'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { color: 'red', w: 50, h: 50 },
				},
				{
					id: createShapeId('hex-shape'),
					type: 'geo',
					x: 60,
					y: 0,
					props: { color: '#00FF00', w: 50, h: 50 },
				},
				{
					id: createShapeId('rgb-shape'),
					type: 'geo',
					x: 120,
					y: 0,
					props: { color: 'rgb(0, 0, 255)', w: 50, h: 50 },
				},
				{
					id: createShapeId('hsl-shape'),
					type: 'geo',
					x: 180,
					y: 0,
					props: { color: 'hsl(60, 100%, 50%)', w: 50, h: 50 },
				},
			]

			editor.createShapes(shapes)

			const createdShapes = shapes.map((s) => editor.getShape<TLGeoShape>(s.id)!)
			expect(createdShapes[0].props.color).toBe('red')
			expect(createdShapes[1].props.color).toBe('#00FF00')
			expect(createdShapes[2].props.color).toBe('rgb(0, 0, 255)')
			expect(createdShapes[3].props.color).toBe('hsl(60, 100%, 50%)')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, createdShapes[0].props.color)).toBe('#e03131')
			expect(getColorValue(lightTheme, createdShapes[1].props.color)).toBe('#00FF00')
			expect(getColorValue(lightTheme, createdShapes[2].props.color)).toBe('rgb(0, 0, 255)')
			expect(getColorValue(lightTheme, createdShapes[3].props.color)).toBe('hsl(60, 100%, 50%)')
		})

		test('should update shape colors when theme is extended', () => {
			const shapeId = createShapeId('theme-test-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'custom',
						w: 100,
						h: 100,
					},
				},
			])

			const shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('custom')

			let lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, 'custom')).toBe('custom')

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						custom: {
							solid: '#8B5CF6',
							fill: '#8B5CF6',
							frameHeadingStroke: '#7C3AED',
							frameHeadingFill: '#F3F4F6',
							frameStroke: '#7C3AED',
							frameFill: '#F9FAFB',
							frameText: '#000000',
							noteFill: '#DDD6FE',
							noteText: '#000000',
							semi: '#EDE9FE',
							pattern: '#A78BFA',
							highlightSrgb: '#C4B5FD',
							highlightP3: 'color(display-p3 0.769 0.710 0.992)',
						},
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						custom: {
							solid: '#A855F7',
							fill: '#A855F7',
							frameHeadingStroke: '#7C2D92',
							frameHeadingFill: '#2A1065',
							frameStroke: '#7C2D92',
							frameFill: '#1E1B4B',
							frameText: '#F2F2F2',
							noteFill: '#581C87',
							noteText: '#F2F2F2',
							semi: '#312E81',
							pattern: '#8B5CF6',
							highlightSrgb: '#7C3AED',
							highlightP3: 'color(display-p3 0.486 0.231 0.929)',
						},
					},
				},
			}))

			lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, 'custom')).toBe('#8B5CF6')
			expect(getColorValue(lightTheme, 'custom', 'fill')).toBe('#8B5CF6')
		})

		test('should maintain color consistency across different shape types', () => {
			const shapes = [
				{
					id: createShapeId('geo-shape'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { color: 'blue', w: 50, h: 50 },
				},
				{
					id: createShapeId('text-shape'),
					type: 'text',
					x: 0,
					y: 60,
					props: { color: 'blue', richText: toRichText('Hello'), autoSize: true },
				},
				{
					id: createShapeId('draw-shape'),
					type: 'draw',
					props: { color: 'blue', segments: [], isComplete: true, isClosed: false },
				},
			]

			editor.createShapes(shapes)

			const createdShapes = shapes.map(
				(s) => editor.getShape<TLGeoShape | TLTextShape | TLDrawShape>(s.id)!
			)
			expect(createdShapes[0].props.color).toBe('blue')
			expect(createdShapes[1].props.color).toBe('blue')
			expect(createdShapes[2].props.color).toBe('blue')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			const expectBlue = lightTheme.colors.blue.solid
			createdShapes.forEach((shape) => {
				expect(getColorValue(lightTheme, shape.props.color)).toBe(expectBlue)
			})
		})

		test('should handle color changes in real-time editing', () => {
			const shapeId = createShapeId('editable-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'red',
						w: 100,
						h: 100,
					},
				},
			])

			let shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('red')

			editor.updateShapes([
				{
					id: shapeId,
					type: 'geo',
					props: { color: 'blue' },
				},
			])

			shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('blue')

			editor.updateShapes([
				{
					id: shapeId,
					type: 'geo',
					props: { color: '#FF00FF' },
				},
			])

			shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('#FF00FF')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, shape.props.color)).toBe('#FF00FF')
		})

		test('should work with color picker UI components', () => {
			const shapeId = createShapeId('picker-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'black',
						w: 100,
						h: 100,
					},
				},
			])

			editor.setSelectedShapes([shapeId])
			expect(editor.getSelectedShapeIds()).toContain(shapeId)

			editor.setStyleForSelectedShapes(DefaultColorStyle, 'green')
			const updatedShape = editor.getShape<TLGeoShape>(shapeId)!
			expect(updatedShape.props.color).toBe('green')

			editor.setStyleForSelectedShapes(DefaultColorStyle, '#CCCCCC')
			const finalShape = editor.getShape<TLGeoShape>(shapeId)!
			expect(finalShape.props.color).toBe('#CCCCCC')
		})

		test('should support undo/redo of color changes', () => {
			const shapeId = createShapeId('undo-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'red',
						w: 100,
						h: 100,
					},
				},
			])

			let shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('red')

			editor.markHistoryStoppingPoint('color-change')
			editor.updateShapes([
				{
					id: shapeId,
					type: 'geo',
					props: { color: 'blue' },
				},
			])

			shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('blue')

			editor.undo()
			shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('red')

			editor.redo()
			shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('blue')
		})
	})

	describe('Performance and edge cases', () => {
		test('should handle large numbers of custom colors efficiently', () => {
			const startTime = performance.now()
			const numColors = 100

			const customColors: Record<string, any> = {}
			for (let i = 0; i < numColors; i++) {
				customColors[`color${i}`] = {
					solid: `#${i.toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}`,
					fill: `#${i.toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}`,
					frameHeadingStroke: '#333333',
					frameHeadingFill: '#FFFFFF',
					frameStroke: '#333333',
					frameFill: '#FFFFFF',
					frameText: '#000000',
					noteFill: '#F0F0F0',
					noteText: '#000000',
					semi: '#CCCCCC',
					pattern: '#888888',
					highlightSrgb: '#DDDDDD',
					highlightP3: 'color(display-p3 0.867 0.867 0.867)',
				}
			}

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						...customColors,
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						...customColors,
					},
				},
			}))

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			for (let i = 0; i < numColors; i++) {
				const colorName = `color${i}`
				expect(lightTheme.colors[colorName]).toBeDefined()
				expect(isDefaultThemeColor(colorName)).toBe(true)
				expect(getColorValue(lightTheme, colorName)).toMatch(/^#[0-9a-fA-F]{6}$/)
			}

			const endTime = performance.now()
			const executionTime = endTime - startTime
			expect(executionTime).toBeLessThan(5000)
		})

		test('should not cause memory leaks when extending themes', () => {
			const originalThemes = DefaultColorThemes.get()
			const initialColorCount = Object.keys(originalThemes.light.colors).length

			for (let iteration = 0; iteration < 10; iteration++) {
				extendDefaultColorTheme((themes) => ({
					...themes,
					light: {
						...themes.light,
						colors: {
							...themes.light.colors,
							[`temp${iteration}`]: {
								solid: '#FF0000',
								fill: '#FF0000',
								frameHeadingStroke: '#CC0000',
								frameHeadingFill: '#FFF5F5',
								frameStroke: '#CC0000',
								frameFill: '#FFF8F8',
								frameText: '#000000',
								noteFill: '#FFB3B3',
								noteText: '#000000',
								semi: '#FFE0E0',
								pattern: '#FF6666',
								highlightSrgb: '#FF9999',
								highlightP3: 'color(display-p3 0.996 0.6 0.6)',
							},
						},
					},
					dark: {
						...themes.dark,
						colors: {
							...themes.dark.colors,
							[`temp${iteration}`]: {
								solid: '#FF0000',
								fill: '#FF0000',
								frameHeadingStroke: '#701E1E',
								frameHeadingFill: '#301616',
								frameStroke: '#701E1E',
								frameFill: '#1B1313',
								frameText: '#F2F2F2',
								noteFill: '#7E201F',
								noteText: '#F2F2F2',
								semi: '#382726',
								pattern: '#8F3734',
								highlightSrgb: '#DE002C',
								highlightP3: 'color(display-p3 0.7978 0.0509 0.2035)',
							},
						},
					},
				}))
			}

			const finalThemes = DefaultColorThemes.get()
			const finalColorCount = Object.keys(finalThemes.light.colors).length
			expect(finalColorCount).toBe(initialColorCount + 10)

			for (let i = 0; i < 10; i++) {
				expect(finalThemes.light.colors[`temp${i}`]).toBeDefined()
				expect(finalThemes.dark.colors[`temp${i}`]).toBeDefined()
			}
		})

		// test('should handle concurrent theme modifications safely', async () => {
		// 	const promises: Promise<void>[] = []
		// 	for (let i = 0; i < 5; i++) {
		// 		promises.push(
		// 			new Promise<void>((resolve) => {
		// 				setTimeout(() => {
		// 					extendDefaultColorTheme((themes) => ({
		// 						...themes,
		// 						light: {
		// 							...themes.light,
		// 							colors: {
		// 								...themes.light.colors,
		// 								[`concurrent${i}`]: {
		// 									solid: `#${i}${i}${i}${i}${i}${i}`,
		// 									fill: `#${i}${i}${i}${i}${i}${i}`,
		// 									frameHeadingStroke: '#333333',
		// 									frameHeadingFill: '#FFFFFF',
		// 									frameStroke: '#333333',
		// 									frameFill: '#FFFFFF',
		// 									frameText: '#000000',
		// 									noteFill: '#F0F0F0',
		// 									noteText: '#000000',
		// 									semi: '#CCCCCC',
		// 									pattern: '#888888',
		// 									highlightSrgb: '#DDDDDD',
		// 									highlightP3: 'color(display-p3 0.867 0.867 0.867)',
		// 								},
		// 							},
		// 						},
		// 						dark: {
		// 							...themes.dark,
		// 							colors: {
		// 								...themes.dark.colors,
		// 								[`concurrent${i}`]: {
		// 									solid: `#${i}${i}${i}${i}${i}${i}`,
		// 									fill: `#${i}${i}${i}${i}${i}${i}`,
		// 									frameHeadingStroke: '#333333',
		// 									frameHeadingFill: '#333333',
		// 									frameStroke: '#333333',
		// 									frameFill: '#111111',
		// 									frameText: '#F2F2F2',
		// 									noteFill: '#222222',
		// 									noteText: '#F2F2F2',
		// 									semi: '#333333',
		// 									pattern: '#777777',
		// 									highlightSrgb: '#444444',
		// 									highlightP3: 'color(display-p3 0.267 0.267 0.267)',
		// 								},
		// 							},
		// 						},
		// 					}))
		// 					resolve()
		// 				}, i * 10)
		// 			})
		// 		)
		// 	}

		// 	await Promise.all(promises)
		// 	const themes = DefaultColorThemes.get()
		// 	for (let i = 0; i < 5; i++) {
		// 		expect(themes.light.colors[`concurrent${i}`]).toBeDefined()
		// 		expect(themes.dark.colors[`concurrent${i}`]).toBeDefined()
		// 		expect(isDefaultThemeColor(`concurrent${i}`)).toBe(true)
		// 	}
		// })

		test('should validate color format and throw appropriate errors', () => {
			const validColors = [
				'#FF0000',
				'#ff0000',
				'rgb(255, 0, 0)',
				'rgba(255, 0, 0, 0.5)',
				'hsl(0, 100%, 50%)',
				'hsla(0, 100%, 50%, 0.5)',
				'red',
				'transparent',
			]

			validColors.forEach((color) => {
				const shapeId = createShapeId(`valid-${color.replace(/[^a-z0-9]/gi, '')}`)
				expect(() => {
					editor.createShapes([
						{
							id: shapeId,
							type: 'geo',
							x: 0,
							y: 0,
							props: {
								color,
								w: 50,
								h: 50,
							},
						},
					])
				}).not.toThrow()

				const shape = editor.getShape<TLGeoShape>(shapeId)!
				expect(shape.props.color).toBe(color)
			})

			const edgeCaseColors = [
				'',
				'not-a-color',
				'#',
				'#GGG',
				'rgb(300, 300, 300)',
				'hsl(400, 200%, 200%)',
			]

			edgeCaseColors.forEach((color) => {
				const shapeId = createShapeId(`edge-${color.replace(/[^a-z0-9]/gi, '') || 'empty'}`)
				expect(() => {
					editor.createShapes([
						{
							id: shapeId,
							type: 'geo',
							x: 0,
							y: 0,
							props: {
								color,
								w: 50,
								h: 50,
							},
						},
					])
				}).not.toThrow()

				const shape = editor.getShape<TLGeoShape>(shapeId)!
				expect(shape.props.color).toBe(color)

				const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
				expect(getColorValue(lightTheme, color)).toBe(color)
			})
		})

		test('should handle theme extension during active editing sessions', () => {
			const shapeId = createShapeId('active-edit-shape')
			editor.createShapes([
				{
					id: shapeId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						color: 'red',
						w: 100,
						h: 100,
					},
				},
			])

			editor.setSelectedShapes([shapeId])
			let shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('red')

			extendDefaultColorTheme((themes) => ({
				...themes,
				light: {
					...themes.light,
					colors: {
						...themes.light.colors,
						dynamic: {
							solid: '#00FF00',
							fill: '#00FF00',
							frameHeadingStroke: '#00CC00',
							frameHeadingFill: '#F5FFF5',
							frameStroke: '#00CC00',
							frameFill: '#F8FFF8',
							frameText: '#000000',
							noteFill: '#B3FFB3',
							noteText: '#000000',
							semi: '#E0FFE0',
							pattern: '#66FF66',
							highlightSrgb: '#99FF99',
							highlightP3: 'color(display-p3 0.6 0.996 0.6)',
						},
					},
				},
				dark: {
					...themes.dark,
					colors: {
						...themes.dark.colors,
						dynamic: {
							solid: '#00DD00',
							fill: '#00DD00',
							frameHeadingStroke: '#007700',
							frameHeadingFill: '#0F2A0F',
							frameStroke: '#007700',
							frameFill: '#0A1C0A',
							frameText: '#F2F2F2',
							noteFill: '#004400',
							noteText: '#F2F2F2',
							semi: '#273A27',
							pattern: '#4DCC4D',
							highlightSrgb: '#00AA00',
							highlightP3: 'color(display-p3 0.27 0.67 0.02)',
						},
					},
				},
			}))

			expect(isDefaultThemeColor('dynamic')).toBe(true)

			editor.setStyleForSelectedShapes(DefaultColorStyle, 'dynamic')
			shape = editor.getShape<TLGeoShape>(shapeId)!
			expect(shape.props.color).toBe('dynamic')

			const lightTheme = getDefaultColorTheme({ colorScheme: 'light' })
			expect(getColorValue(lightTheme, 'dynamic')).toBe('#00FF00')

			const dynamicShapeId = createShapeId('dynamic-shape')
			editor.createShapes([
				{
					id: dynamicShapeId,
					type: 'geo',
					x: 120,
					y: 0,
					props: {
						color: 'dynamic',
						w: 50,
						h: 50,
					},
				},
			])

			const dynamicShape = editor.getShape<TLGeoShape>(dynamicShapeId)!
			expect(dynamicShape.props.color).toBe('dynamic')
			expect(getColorValue(lightTheme, dynamicShape.props.color)).toBe('#00FF00')
		})
	})
})

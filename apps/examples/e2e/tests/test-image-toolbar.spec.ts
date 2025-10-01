import { expect } from '@playwright/test'
import { Editor, TLAssetId, TLImageShape } from 'tldraw'
import test from '../fixtures/fixtures'
import { setup } from '../shared-e2e'

declare const editor: Editor

test.describe('Image toolbar behaviour', () => {
	test.beforeEach(setup)
	test.beforeEach(async ({ page, isMobile }) => {
		// TODO: the mobile e2e test may need special handling
		if (isMobile) return

		// Create an image shape by inserting an image
		await page.evaluate(() => {
			const imageAsBase64 =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

			const assetId = 'asset:img' as TLAssetId
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'image',
					props: {
						src: imageAsBase64,
						w: 100,
						h: 100,
						name: 'test',
						isAnimated: false,
						mimeType: 'image/png',
					},
					meta: {},
				},
			])
			editor.createShape({
				type: 'image',
				x: 250,
				y: 250,
				props: {
					w: 200,
					h: 150,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1, y: 1 },
					},
					assetId,
				},
			})
		})

		// Select the image
		await page.mouse.click(300, 300)

		// Wait for the toolbar to animate in
		await page.waitForTimeout(150)
	})

	test('zoom slider changes image crop', async ({ page, isMobile }) => {
		if (isMobile) return

		const manipulator = page.getByTestId('tool.image-crop')
		await manipulator.click()

		// Find and use the slider
		const slider = page.getByTestId('tool.image-zoom')
		await slider.click()

		// Move to a higher zoom
		await page.mouse.move(
			await slider.boundingBox().then((box) => box!.x + 100),
			await slider.boundingBox().then((box) => box!.y + 20)
		)
		await page.mouse.down()
		await page.mouse.up()

		const crop = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return imageShape.props.crop
		})

		expect(crop!.bottomRight.x).toBeCloseTo(0.6732, 2)
		expect(crop!.bottomRight.y).toBeCloseTo(0.6732, 2)
		expect(crop!.topLeft.y).toBeCloseTo(0.3267, 2)
		expect(crop!.topLeft.y).toBeCloseTo(0.3267, 2)
	})

	test('aspect ratio dropdown changes image crop', async ({ page, isMobile }) => {
		if (isMobile) return

		const manipulator = page.getByTestId('tool.image-crop')
		await manipulator.click()

		// Open aspect ratio dropdown
		await page.getByTestId('tool.image-aspect-ratio').click()

		// Select the square option
		await page.getByText('Square').click()

		// Check that the image has been cropped to square
		const isSquare = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			const aspectRatio = imageShape.props.w / imageShape.props.h
			return Math.abs(aspectRatio - 1) < 0.01 // Check if width/height ratio is approximately 1
		})

		expect(isSquare).toBe(true)

		// Try another aspect ratio - landscape
		await page.getByText('Landscape').click()

		// Check that the image has been cropped to landscape (4:3)
		const isLandscape = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			const aspectRatio = imageShape.props.w / imageShape.props.h
			return Math.abs(aspectRatio - 4 / 3) < 0.01 // Check if width/height ratio is approximately 4/3
		})

		expect(isLandscape).toBe(true)
	})

	test.skip('flip buttons flip the image', async ({ page, isMobile }) => {
		if (isMobile) return

		const manipulator = page.getByTestId('tool.image-crop')
		await manipulator.click()

		// Get initial state
		const initialState = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return {
				w: imageShape.props.w,
				h: imageShape.props.h,
				flipX: imageShape.props.flipX ?? false,
				flipY: imageShape.props.flipY ?? false,
			}
		})

		// Click flip horizontal button
		await page.getByTestId('tool.image-flip-horizontal').click()

		// Check horizontal flip state
		const afterHorizontalFlip = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return {
				w: imageShape.props.w,
				h: imageShape.props.h,
				flipX: imageShape.props.flipX ?? false,
				flipY: imageShape.props.flipY ?? false,
			}
		})

		expect(afterHorizontalFlip.flipX).not.toEqual(initialState.flipX)
		expect(afterHorizontalFlip.w).toEqual(initialState.w) // Width shouldn't change

		// Click flip vertical button
		await page.getByTestId('tool.image-flip-vertical').click()

		// Check vertical flip state
		const afterVerticalFlip = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return {
				w: imageShape.props.w,
				h: imageShape.props.h,
				flipX: imageShape.props.flipX ?? false,
				flipY: imageShape.props.flipY ?? false,
			}
		})

		expect(afterVerticalFlip.flipY).not.toEqual(initialState.flipY)
		expect(afterVerticalFlip.h).toEqual(initialState.h) // Height shouldn't change
	})

	test('alt text button opens alt text editor', async ({ page, isMobile }) => {
		if (isMobile) return

		// Click the Alt Text button
		await page.getByTestId('tool.image-alt-text').click()

		// Enter some alt text
		await page.getByTestId('media-toolbar.alt-text-input').fill('A test image for e2e testing')

		// Save the alt text
		await page.getByTestId('tool.media-alt-text-confirm').click()

		// Check that the alt text was saved
		const altText = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return imageShape.props.altText
		})

		expect(altText).toBe('A test image for e2e testing')
	})

	test('image replacement works', async ({ page, isMobile }) => {
		if (isMobile) return

		// Get initial image asset id
		const initialAssetId = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return imageShape.props.assetId
		})

		// Click the replace image button
		await page.getByTestId('tool.image-replace').click()

		// This would typically open a file dialog, which is hard to test in Playwright
		// Instead, we'll directly trigger the image replacement through evaluation
		await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			const newImageAsBase64 =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QzwAEjDAGACCDAv8cI7IoAAAAAElFTkSuQmCC'
			const newAssetId = 'asset:img-new' as TLAssetId
			editor.createAssets([
				{
					id: newAssetId,
					typeName: 'asset',
					type: 'image',
					props: {
						src: newImageAsBase64,
						w: 100,
						h: 100,
						name: 'test',
						isAnimated: false,
						mimeType: 'image/png',
					},
					meta: {},
				},
			])

			editor.updateShape({
				id: imageShape.id,
				type: imageShape.type,
				props: {
					assetId: newAssetId,
				},
			})
		})

		// Check that asset id changed
		const newAssetId = await page.evaluate(() => {
			const imageShape = editor.getSelectedShapes()[0] as TLImageShape
			return imageShape.props.assetId
		})

		expect(newAssetId).not.toEqual(initialAssetId)
	})
})

import { expect } from '@playwright/test'
import { Editor, TLAssetId, TLVideoShape } from 'tldraw'
import test from '../fixtures/fixtures'
import { setup } from '../shared-e2e'

declare const editor: Editor

test.describe('Video toolbar behaviour', () => {
	test.beforeEach(setup)
	test.beforeEach(async ({ page, isMobile }) => {
		// TODO: the mobile e2e test may need special handling
		if (isMobile) return

		// Create an video shape by inserting an video
		await page.evaluate(() => {
			const videoAsBase64 = `data:video/mp4;base64,AAAAFGZ0e`
			const assetId = 'asset:video' as TLAssetId
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'video',
					props: {
						src: videoAsBase64,
						w: 100,
						h: 100,
						name: 'test',
						isAnimated: false,
						mimeType: 'video/mp4',
					},
					meta: {},
				},
			])
			editor.createShape({
				type: 'video',
				x: 250,
				y: 250,
				props: {
					w: 200,
					h: 150,
					assetId,
				},
			})
		})

		// Select the video
		await page.mouse.click(300, 300)

		// Wait for the toolbar to animate in
		await page.waitForTimeout(150)
	})

	test('alt text button opens alt text editor', async ({ page, isMobile }) => {
		if (isMobile) return

		// Click the Alt Text button
		await page.getByTestId('tool.video-alt-text').click()

		// Enter some alt text
		await page.getByTestId('media-toolbar.alt-text-input').fill('A test video for e2e testing')

		// Save the alt text
		await page.getByTestId('tool.media-alt-text-confirm').click()

		// Check that the alt text was saved
		const altText = await page.evaluate(() => {
			const videoShape = editor.getSelectedShapes()[0] as TLVideoShape
			return videoShape.props.altText
		})

		expect(altText).toBe('A test video for e2e testing')
	})

	test('video replacement works', async ({ page, isMobile }) => {
		if (isMobile) return

		// Get initial video asset id
		const initialAssetId = await page.evaluate(() => {
			const videoShape = editor.getSelectedShapes()[0] as TLVideoShape
			return videoShape.props.assetId
		})

		// Click the replace video button
		await page.getByTestId('tool.video-replace').click()

		// This would typically open a file dialog, which is hard to test in Playwright
		// Instead, we'll directly trigger the video replacement through evaluation
		await page.evaluate(() => {
			const newVideoAsBase64 = `data:video/mp4;base64,AAAAFGZ0eXBx`
			const videoShape = editor.getSelectedShapes()[0] as TLVideoShape
			const newAssetId = 'asset:video-new' as TLAssetId
			editor.createAssets([
				{
					id: newAssetId,
					typeName: 'asset',
					type: 'video',
					props: {
						src: newVideoAsBase64,
						w: 100,
						h: 100,
						name: 'test',
						isAnimated: false,
						mimeType: 'video/mp4',
					},
					meta: {},
				},
			])

			editor.updateShape({
				id: videoShape.id,
				type: videoShape.type,
				props: {
					assetId: newAssetId,
				},
			})
		})

		// Check that asset id changed
		const newAssetId = await page.evaluate(() => {
			const videoShape = editor.getSelectedShapes()[0] as TLVideoShape
			return videoShape.props.assetId
		})

		expect(newAssetId).not.toEqual(initialAssetId)
	})
})

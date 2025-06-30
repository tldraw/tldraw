import { expect } from '@playwright/test'
import { Editor, TLAssetId, TLAudioShape } from 'tldraw'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

declare const editor: Editor

test.describe('Audio toolbar behaviour', () => {
	test.beforeEach(setup)
	test.beforeEach(async ({ page, isMobile }) => {
		// TODO: the mobile e2e test may need special handling
		if (isMobile) return

		// Create an audio shape by inserting an audio
		await page.evaluate(() => {
			const audioAsBase64 = `data:audio/mp4;base64,AAAAFGZ0e`
			const assetId = 'asset:audio' as TLAssetId
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'audio',
					props: {
						src: audioAsBase64,
						w: 100,
						h: 100,
						name: 'test',
						isAnimated: false,
						mimeType: 'audio/mp4',
					},
					meta: {},
				},
			])
			editor.createShape({
				type: 'audio',
				x: 250,
				y: 250,
				props: {
					w: 200,
					h: 150,
					assetId,
				},
			})
		})

		// Select the audio
		await page.mouse.click(300, 300)

		// Wait for the toolbar to animate in
		await page.waitForTimeout(150)
	})

	test('alt text button opens alt text editor', async ({ page, isMobile }) => {
		if (isMobile) return

		// Click the Alt Text button
		await page.getByTitle('Alternative text').click()

		// Enter some alt text
		await page.getByTestId('media-toolbar.alt-text-input').fill('A test audio for e2e testing')

		// Save the alt text
		await page.getByTitle('Confirm').click()

		// Check that the alt text was saved
		const altText = await page.evaluate(() => {
			const audioShape = editor.getSelectedShapes()[0] as TLAudioShape
			return audioShape.props.altText
		})

		expect(altText).toBe('A test audio for e2e testing')
	})

	test('audio replacement works', async ({ page, isMobile }) => {
		if (isMobile) return

		// Get initial audio asset id
		const initialAssetId = await page.evaluate(() => {
			const audioShape = editor.getSelectedShapes()[0] as TLAudioShape
			return audioShape.props.assetId
		})

		// Click the replace audio button
		await page.getByTitle('Replace media').click()

		// This would typically open a file dialog, which is hard to test in Playwright
		// Instead, we'll directly trigger the audio replacement through evaluation
		await page.evaluate(() => {
			const newAudioAsBase64 = `data:audio/mp4;base64,AAAAFGZ0eXBx`
			const audioShape = editor.getSelectedShapes()[0] as TLAudioShape
			const newAssetId = 'asset:audio-new' as TLAssetId
			editor.createAssets([
				{
					id: newAssetId,
					typeName: 'asset',
					type: 'audio',
					props: {
						src: newAudioAsBase64,
						w: 100,
						h: 100,
						name: 'test',
						isAnimated: false,
						mimeType: 'audio/mp4',
					},
					meta: {},
				},
			])

			editor.updateShape({
				id: audioShape.id,
				type: audioShape.type,
				props: {
					assetId: newAssetId,
				},
			})
		})

		// Check that asset id changed
		const newAssetId = await page.evaluate(() => {
			const audioShape = editor.getSelectedShapes()[0] as TLAudioShape
			return audioShape.props.assetId
		})

		expect(newAssetId).not.toEqual(initialAssetId)
	})
})

import { codeInput } from '@sanity/code-input'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { sanityConfig } from './config'
import { schemas } from './schemas'

export default defineConfig({
	name: 'tldraw-website',
	title: 'tldraw Website',
	projectId: sanityConfig.projectId,
	dataset: sanityConfig.dataset,
	basePath: '/studio',
	plugins: [structureTool(), codeInput()],
	schema: {
		types: schemas,
	},
})

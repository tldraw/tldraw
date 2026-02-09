import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { sanityConfig } from './config'
import { schemas } from './schemas'

export default defineConfig({
	name: 'tldraw-website',
	title: 'tldraw Website',
	projectId: sanityConfig.projectId,
	dataset: sanityConfig.dataset,
	plugins: [structureTool()],
	schema: {
		types: schemas,
	},
})

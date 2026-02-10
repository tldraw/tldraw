/**
 * Migration script: Framer FAQ → Sanity
 *
 * The FAQ content on tldraw.dev is hardcoded in the Framer frontend (not in the Framer CMS).
 * This script contains the extracted HTML answers (with inline links) and pushes them
 * to Sanity as faqItem documents with PortableText answers.
 *
 * Usage:
 *   1. Set SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, and NEXT_PUBLIC_SANITY_DATASET
 *   2. Run: npx tsx scripts/migrate-faq.ts
 */

import { htmlToBlocks } from '@sanity/block-tools'
import { createClient } from '@sanity/client'
import { Schema } from '@sanity/schema'
import { JSDOM } from 'jsdom'

// Configure Sanity client
const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'staging',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

// Minimal schema for block-tools HTML conversion
const defaultSchema = Schema.compile({
	name: 'default',
	types: [
		{
			type: 'object',
			name: 'faqItem',
			fields: [
				{
					title: 'Answer',
					name: 'answer',
					type: 'array',
					of: [{ type: 'block' }],
				},
			],
		},
	],
})

const blockContentType = defaultSchema
	.get('faqItem')
	.fields.find((f: { name: string }) => f.name === 'answer').type

function htmlToPortableText(html: string) {
	if (!html) return []
	// @ts-expect-error - block-tools types
	return htmlToBlocks(html, blockContentType, {
		parseHtml: (htmlStr: string) => new JSDOM(htmlStr).window.document,
	})
}

/**
 * Clean up Framer HTML before converting to PortableText:
 * - Strip Framer CSS classes and React hydration comments
 * - Normalize relative URLs (./foo → /foo)
 * - Remove tracking parameters from Discord/tldraw.com URLs
 * - Convert absolute tldraw.dev URLs to relative paths
 */
function cleanHtml(html: string): string {
	return (
		html
			// Remove React hydration comments
			.replace(/<!--\$?-->/g, '')
			.replace(/<!--\/?\$-->/g, '')
			// Remove Framer CSS classes
			.replace(/\s*class="[^"]*"/g, '')
			// Remove dir attributes
			.replace(/\s*dir="auto"/g, '')
			// Clean Discord URLs: remove tracking params
			.replace(/https:\/\/discord\.tldraw\.com\/[^"]*(?=#|")/g, 'https://discord.tldraw.com/')
			.replace(/https:\/\/discord\.tldraw\.com\/\?[^"#]*/g, 'https://discord.tldraw.com/')
			// Clean tldraw.com URLs: remove session tracking
			.replace(/https:\/\/tldraw\.com\/#[^"']*/g, 'https://tldraw.com/')
			// Convert absolute tldraw.dev URLs to relative
			.replace(/https:\/\/tldraw\.dev\//g, '/')
			// Normalize relative paths: ./foo → /foo
			.replace(/href="\.\/([^"]*?)"/g, 'href="/$1"')
			.replace(/href="\.\/"/g, 'href="/"')
			// Remove target and rel attributes (PortableText handles links its own way)
			.replace(/\s*target="[^"]*"/g, '')
			.replace(/\s*rel="[^"]*"/g, '')
	)
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
}

// --- FAQ content extracted from tldraw.dev/faq ---

interface FaqEntry {
	section: string
	question: string
	answerHtml: string
}

const faqEntries: FaqEntry[] = [
	// ── Commercial ──
	{
		section: 'Commercial',
		question: 'What is the tldraw SDK?',
		answerHtml:
			'<p>The tldraw SDK is a set of components and modules that you can use to bring a canvas into any product. It is source available on <a href="https://github.com/tldraw/tldraw" target="_blank" rel="noopener">GitHub</a>. The SDK is commercially licensed.</p>',
	},
	{
		section: 'Commercial',
		question: 'What is tldraw?',
		answerHtml:
			'<p>tldraw is a London-based startup, founded in 2022 by <a href="https://x.com/steveruizok" target="_blank" rel="noopener">Steve Ruiz</a>, to develop the tldraw SDK.</p><p>Learn more on our <a href="./company">company</a> page, our <a href="https://x.com/tldraw" target="_blank" rel="noopener">social media</a>, or browse our <a href="./blog/events">videos</a>. See our side projects on our <a href="./showcase">showcase</a> page.</p>',
	},
	{
		section: 'Commercial',
		question: 'Is the tldraw SDK free to use?',
		answerHtml:
			'<p>In development, yes. In production, mostly no. To use the SDK in production, you will need to have a <a href="./pricing">free trial license</a>, a <a href="./pricing">commercial license</a>, or a <a href="./pricing">free hobby license</a>. You do not need a license to use the SDK in development.</p>',
	},
	{
		section: 'Commercial',
		question: 'Is the tldraw SDK open source?',
		answerHtml:
			'<p>No, the tldraw SDK is <a href="./pricing">commercially-licensed</a> software. However, the SDK is source available: you can view the source code on <a href="https://github.com/tldraw/tldraw" target="_blank" rel="noopener">GitHub</a>.</p>',
	},
	{
		section: 'Commercial',
		question: 'Can I use the tldraw SDK in a commercial application?',
		answerHtml:
			'<p>Yes. See our <a href="./showcase">showcase</a> for examples of companies building with the tldraw SDK.</p>',
	},
	{
		section: 'Commercial',
		question: "What's the difference between tldraw.com and the SDK?",
		answerHtml:
			'<p><a href="https://tldraw.com/" target="_blank" rel="noopener">tldraw.com</a> is our flagship demo of the tldraw SDK, designed to be a very good free whiteboard. We ship early versions of the SDK to tldraw.com for testing and evaluation.</p>',
	},
	{
		section: 'Commercial',
		question: 'Does the SDK collect diagnostics?',
		answerHtml:
			'<p>We collect anonymous usage information in two ways: from requests for our static assets (such as our default fonts, icons and watermark), and from our hobby license watermark in production. If you <a href="https://tldraw.dev/installation#Static-assets" rel="noopener">self-host</a> all static assets on a normal license then no external requests are made.</p>',
	},
	{
		section: 'Commercial',
		question: 'Do I need separate licenses for different domains?',
		answerHtml:
			'<p>Nope! We map all relevant domains you plan to host the SDK on to a single license.</p>',
	},
	{
		section: 'Commercial',
		question: 'How can I get help and support with the tldraw SDK?',
		answerHtml:
			'<p>The best place for community support is either <a href="https://github.com/tldraw/tldraw" target="_blank" rel="noopener">GitHub</a> or <a href="https://discord.tldraw.com/" target="_blank" rel="noopener">Discord</a>.</p><p>Custom support agreements are available as part of our business licenses. See the <a href="./pricing">Pricing</a> page for further details.</p>',
	},
	// ── Technical ──
	{
		section: 'Technical',
		question: 'How should I get started with the tldraw SDK?',
		answerHtml:
			'<p>Follow our <a href="https://tldraw.dev/quick-start" target="_blank" rel="noopener">quick-start guide</a>. You will learn about the SDK\u2019s components, how to access the Editor, and even set up collaboration with <a href="https://tldraw.dev/docs/collaboration" rel="noopener">tldraw sync</a>.</p><p>Prefer to dive into code? Visit the <a href="https://stackblitz.com/edit/vitejs-vite-2jjmt6" target="_blank" rel="noopener">sandbox</a>, try our <a href="https://tldraw.dev/starter-kits/overview" target="_blank" rel="noopener">starter kits</a>, or run <code>npm create tldraw@latest</code> to browse templates.</p>',
	},
	{
		section: 'Technical',
		question: 'How does tldraw render its canvas? WebGL? WebGPU?',
		answerHtml:
			'<p>tldraw\u2019s canvas is a React component that renders shapes with HTML and CSS. You can put any regular website content onto the canvas, including buttons, videos, even other tldraws.</p><p>You\u2019re free to combine technologies. The SDK uses canvas elements for indicators and its minimap. Our <a href="https://tldraw.dev/starter-kits/shader" target="_blank" rel="noopener">shader starter kit</a> shows how to use a WebGL background. Get creative!</p>',
	},
	{
		section: 'Technical',
		question: 'Can I use the SDK with Vue, Angular, or other frameworks?',
		answerHtml:
			'<p>Yes. The SDK\u2019s main export is a regular React component. To render it in a different framework, you would use your framework\u2019s regular method of rendering React components. For example, in Vue you would use a <a href="https://dev.to/amirkian007/how-to-render-react-components-in-vue-1e0f" rel="noopener">Vue connector</a>, as demonstrated in our <a href="https://github.com/tldraw/vue-template" target="_blank" rel="noopener">Vue template</a>. In Angular, you would use an <a href="https://web-world.medium.com/how-to-use-react-web-components-in-angular-b3ac7e39fd17" rel="noopener">Angular wrapper component</a>.</p>',
	},
	{
		section: 'Technical',
		question: 'Does the SDK work on mobile?',
		answerHtml:
			'<p>Yes. The SDK works within mobile browsers but you can also embed the SDK in a WebView to use it within a native app. Multi-touch controls and stylus inputs are fully supported, and the UI adapts to vertical screen sizes. Here\u2019s an <a href="https://tldraw.dev/examples/force-mobile" rel="noopener">example</a> for adjusting the canvas to a mobile display.</p>',
	},
	{
		section: 'Technical',
		question: 'How do I report a bug or technical issue?',
		answerHtml:
			'<p>You can post a Bug Report, Example Request or a Feature Request <a href="https://github.com/tldraw/tldraw/issues/new/choose" target="_blank" rel="noopener">on this page</a>.</p>',
	},
	{
		section: 'Technical',
		question: 'How do I request a feature for tldraw?',
		answerHtml:
			'<p>You can request features through our <a href="https://github.com/tldraw/tldraw/issues/new?template=feature_request.yml" target="_blank" rel="noopener">GitHub</a> or in our <a href="https://discord.tldraw.com/" target="_blank" rel="noopener">Discord</a>.</p>',
	},
	{
		section: 'Technical',
		question: 'Is there a tldraw MCP server?',
		answerHtml:
			'<p>There is not yet an official tldraw MCP server! If you\u2019re interested in this, we would love to know what you plan on building with it, hop by our <a href="https://discord.tldraw.com/" rel="noopener">Discord</a> and come chat!</p>',
	},
	{
		section: 'Technical',
		question: 'Is there an LLMs.txt file for the tldraw SDK?',
		answerHtml:
			'<p>Yes, we maintain an LLMs.txt file that contains links to all of our docs pages at <a href="https://tldraw.dev/llms.txt" target="_blank" rel="noopener">tldraw.dev/llms.txt</a>.</p><p>We also maintain markdown versions of our <a href="https://tldraw.dev/llms-docs.txt" target="_blank" rel="noopener">docs</a> and <a href="https://tldraw.dev/llms-examples.txt" target="_blank" rel="noopener">examples</a>, and <a href="https://tldraw.dev/llms-full.txt" target="_blank" rel="noopener">everything combined</a>.</p><p>Try adding one or more of these files to your AI assistant\u2019s context window for a better experience when developing with the tldraw SDK.</p>',
	},
	{
		section: 'Technical',
		question: 'Is PDF export available?',
		answerHtml:
			'<p>Yes, refer to the <a href="https://tldraw.dev/examples/pdf-editor" rel="noopener">PDF Editor</a> example to see one possible implementation.</p>',
	},
	{
		section: 'Technical',
		question: 'How can I create custom shapes?',
		answerHtml:
			'<p>To create a custom shape, define a custom shape util and pass it to the tldraw component. Find out how to do this by reading the <a href="https://tldraw.dev/docs/shapes#Custom-shapes-1" target="_blank" rel="noopener">Custom shapes</a> section of our docs, or by exploring the <a href="https://tldraw.dev/examples/custom-shape" target="_blank" rel="noopener">custom shapes examples</a>.</p>',
	},
	{
		section: 'Technical',
		question: 'Is the SDK compatible with lower-spec hardware?',
		answerHtml:
			'<p>Anything that can run a browser will be able to run a tldraw canvas.</p><p>For improved performance, you can configure limits on number of shapes per page (with <a href="https://tldraw.dev/reference/editor/TldrawOptions#maxShapesPerPage" target="_blank" rel="noopener">maxShapesPerPage</a>) and number of users in a room if you want to impose different constraints. See our <a href="https://tldraw.dev/sdk-features/performance" target="_blank" rel="noopener">performance article</a> for more suggestions.</p>',
	},
	{
		section: 'Technical',
		question: 'How hard will it be to migrate from version X to the current version?',
		answerHtml:
			'<p><em>For Version 2.x and above:</em><br>Migrating to tldraw 4.0 from version 3.x or 2.x will be straightforward as their underlying architectures are the same. If you\u2019re using tldraw as a drop-in whiteboard without much customisation, it is likely that you will not need to change anything. If you have made some customizations, you might find small API tweaks, or places where deprecated APIs have been removed. Details of those (and alternatives you can switch to) are documented in our <a href="https://tldraw.dev/releases-versioning" rel="noopener">release notes</a> for each version.</p><p>tldraw has a built-in data migration system, so if you are using editor snapshots or tldraw sync, your data will automatically be migrated to the latest version the next time it\u2019s loaded. If you get stuck at any point, please reach out to our engineers on <a href="https://discord.tldraw.com/" target="_blank" rel="noopener">Discord</a>.</p><p><em>For Version 1.x:</em><br>tldraw 2.0 and onwards is a complete rewrite from 1.0. It comes with greater customization, performance, and entirely new features and systems such as <a href="https://tldraw.dev/docs/collaboration" target="_blank" rel="noopener">tldraw sync</a>. For cases of light customization, migration should be fairly straightforward. For heavy customization, you\u2019ll need to adapt to modern versions of tldraw. The biggest challenge will be migrating data from the 1.0 format to 2.0. Reach out on <a href="https://discord.tldraw.com/" target="_blank" rel="noopener">Discord</a> for help with that.</p>',
	},
	{
		section: 'Technical',
		question: 'Can I use yjs for real-time collaboration?',
		answerHtml:
			'<p>Yes, though we recommend using <a href="https://tldraw.dev/docs/sync" target="_blank" rel="noopener">tldraw sync</a>, which is purpose-built for canvas collaboration.</p><p>tldraw sync is our library for fast, fault-tolerant shared document syncing \u2014 it\u2019s battle-tested in production on tldraw.com and receives continuous updates.</p><p>You can get a prototype up and running fast with our <a href="https://tldraw.dev/starter-kits/multiplayer" target="_blank" rel="noopener">multiplayer starter kit</a>.</p><p>We opted to develop and maintain tldraw sync since yjs isn\u2019t designed for canvas data. If you prefer to use yjs, the SDK provides integration points to do so.</p>',
	},
	{
		section: 'Technical',
		question: 'Can I render tldraw server-side to generate images?',
		answerHtml:
			'<p>Yes. While tldraw doesn\u2019t currently provide a dedicated server-side rendering library, you can use headless browser automation tools like Playwright or Puppeteer to load tldraw in a browser and generate the images.</p>',
	},
	// ── Store & multiplayer sync ──
	{
		section: 'Store & multiplayer sync',
		question: 'How does multiplayer collaboration work?',
		answerHtml:
			'<p>The tldraw SDK is built with low-level APIs to share and receive data about the document and users.</p><p>While you can use these APIs to integrate any collaboration backend with tldraw, our recommended solution is <a href="./features/composable-primitives/multiplayer-collaboration">tldraw sync</a>, a self-hosted solution that we use for collaboration on tldraw.com.</p>',
	},
	{
		section: 'Store & multiplayer sync',
		question: 'Can I use the tldraw SDK entirely offline?',
		answerHtml:
			'<p>Yes, the tldraw component uses an offline store by default. Check out the <a href="https://tldraw.dev/docs/persistence" rel="noopener">Persistence</a> docs page to learn how to save and load a board\u2019s contents entirely offline.</p>',
	},
	{
		section: 'Store & multiplayer sync',
		question: 'Is it possible to run the SDK on localhost?',
		answerHtml:
			'<p>Yes. We have a guide on setting up a local development server <a href="https://github.com/tldraw/tldraw?tab=readme-ov-file#local-development" rel="noopener">here</a>.</p>',
	},
	{
		section: 'Store & multiplayer sync',
		question: 'Can I store information on the canvas to a database?',
		answerHtml:
			'<p>Yes. The easiest way to do this would be to use <code><a href="https://tldraw.dev/reference/editor/Editor#getSnapshot" target="_blank" rel="noopener">editor.getSnapshot()</a></code> and store the result in an object store like S3. A good option is to use <a href="https://tldraw.dev/docs/sync" rel="noopener">tldraw sync</a> to write it to your object store.</p>',
	},
	{
		section: 'Store & multiplayer sync',
		question: 'How do I implement custom auth and permissions?',
		answerHtml:
			'<p>We have a basic permissions system that allows switching a room to be either \u2018guests can read/write\u2019 or \u2018guests can read only\u2019 mode. We implement that by telling the room <a href="https://github.com/tldraw/tldraw/blob/c4135f4903f563823a231da1aa7d656285066ec6/apps/dotcom/sync-worker/src/TLDrawDurableObject.ts#L754-L776" rel="noopener">Durable Object</a> about changes to the file database row. User permissions (e.g read/write) can be individually set <a href="https://tldraw.dev/reference/sync-core/TLSocketRoom#handleSocketConnect" rel="noopener">when accepting socket connections</a>.</p>',
	},
	{
		section: 'Store & multiplayer sync',
		question: "How do I access the editor's properties reactively?",
		answerHtml:
			'<p>The editor\u2019s state is managed by our custom signals library. To access values from the editor reactively, check out the <a href="https://tldraw.dev/examples/signals" rel="noopener">signals example</a> or read the <a href="https://tldraw.dev/reference/state-react/useValue" rel="noopener">reference pages</a>.</p>',
	},
	// ── Other projects ──
	{
		section: 'Other projects',
		question: 'Where can I find examples of apps built with the tldraw SDK?',
		answerHtml:
			'<p>Explore our <a href="./showcase">Showcase</a> page, check out the <strong>#show-and-tell</strong> channel on our <a href="https://discord.tldraw.com/" target="_blank" rel="noopener">Discord</a> community, or follow us on <a href="https://x.com/tldraw" target="_blank" rel="noopener">X</a>.</p>',
	},
	{
		section: 'Other projects',
		question: 'Where can I find the AI stuff?',
		answerHtml:
			'<p>Find them on our <a href="./showcase">Showcase</a> page. We\u2019ve released <a href="https://teach.tldraw.com/" target="_blank" rel="noopener">Teach</a>, <a href="https://makereal.tldraw.com/" target="_blank" rel="noopener">Make Real</a>, and <a href="https://computer.tldraw.com/home" target="_blank" rel="noopener">Computer</a> so far! Let us know what you think on our <a href="https://discord.tldraw.com/" target="_blank" rel="noopener">Discord</a>.</p><p>We also provide some <a href="./starter-kits/overview">starter kits</a> for building AI apps, such as the <a href="https://github.com/tldraw/tldraw/tree/main/templates/agent" target="_blank" rel="noopener">agent</a> and <a href="https://github.com/tldraw/tldraw/tree/main/templates/branching-chat" target="_blank" rel="noopener">branching chat</a> starters.</p>',
	},
	{
		section: 'Other projects',
		question: 'Where can I find the code for the AI stuff?',
		answerHtml:
			'<p>Find the code for <a href="https://makereal.tldraw.com/" target="_blank" rel="noopener">Make Real</a> in its <a href="https://github.com/tldraw/make-real" target="_blank" rel="noopener">public repo</a>, or fork and clone the <a href="https://github.com/tldraw/make-real-starter" target="_blank" rel="noopener">make real starter</a>.</p><p>The code for <a href="https://computer.tldraw.com/" target="_blank" rel="noopener">Computer</a> is not publicly available, but you can build your own agentic workflow app using our <a href="https://github.com/tldraw/tldraw/tree/main/templates/workflow" target="_blank" rel="noopener">workflow starter</a>.</p><p>The code from <a href="https://teach.tldraw.com/" target="_blank" rel="noopener">Teach</a> moved into our <a href="https://github.com/tldraw/tldraw/tree/main/templates/agent" target="_blank" rel="noopener">agent starter</a>.</p><p>We took down <a href="https://drawfast.tldraw.com/" target="_blank" rel="noopener">Draw Fast</a> but you can still run it locally by cloning its code from the <a href="https://github.com/tldraw/draw-fast" target="_blank" rel="noopener">public repo</a>.</p>',
	},
]

// --- Main ---

async function main() {
	console.log('=== FAQ → Sanity Migration ===')
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'staging'}`)
	console.log(`FAQ entries: ${faqEntries.length}`)

	const sectionOrder = ['Commercial', 'Technical', 'Store & multiplayer sync', 'Other projects']

	let globalOrder = 0

	for (const sectionName of sectionOrder) {
		const items = faqEntries.filter((e) => e.section === sectionName)
		console.log(`\n--- ${sectionName} (${items.length} items) ---`)

		for (const entry of items) {
			const cleaned = cleanHtml(entry.answerHtml)
			const answer = htmlToPortableText(cleaned)
			const id = `faqItem-${slugify(entry.question).slice(0, 80)}`

			const doc = {
				_type: 'faqItem' as const,
				_id: id,
				question: entry.question,
				answer,
				category: entry.section,
				order: globalOrder++,
			}

			await client.createOrReplace(doc)
			console.log(`  + ${entry.question}`)
		}
	}

	console.log(`\n=== Migration complete (${faqEntries.length} FAQ items) ===`)
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})

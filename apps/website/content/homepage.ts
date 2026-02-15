// Hardcoded homepage content matching https://tldraw.dev/
// This can be swapped for Sanity CMS fetches later.

export const heroContent = {
	title: 'Build infinite canvas apps in React with the tldraw SDK',
	subtitle: 'Make whiteboards and more with tldraw\u2019s high-performance web canvas.',
	subtitleHighlight: 'high-performance web canvas',
	ctaPrimary: { label: 'npm create tldraw', url: '/quick-start', variant: 'code' as const },
	ctaSecondary: {
		label: 'or build with a starter kit',
		labelBold: 'build with a starter kit',
		url: '/starter-kits/overview',
	},
}

export const heroLogoBarNames = [
	'ClickUp',
	'Padlet',
	'Mobbin',
	'Jam',
	'Cursor',
	'Replit',
	'Vercel',
	'Stripe',
]

export const whyTldrawContent = {
	title: 'Why tldraw?',
	items: [
		{
			title: 'Canvas infrastructure',
			description:
				'The tldraw SDK offers a solid foundation with enterprise-grade multiplayer sync, persistence, and performance optimizations. Develop with industry-standard web technologies like TypeScript and React.',
		},
		{
			title: 'Accelerate development',
			description:
				'Skip the backlog with table-stakes features like copy and paste, undo and redo and cross-tab sync. Start strong with our comprehensive library of default shapes, tools, and user interface components.',
		},
		{
			title: 'Customize, extend and control',
			description:
				'Customize our defaults or go further with custom shapes, interactions, and user interfaces. A powerful runtime API gives you full programmatic control of the canvas contents, effects, and behaviors.',
		},
		{
			title: 'Get involved',
			description:
				'Read the source code, create issues, and contribute code on GitHub. Join the community, find contractors, and get help from thousands of developers using the tldraw SDK.',
		},
	],
}

export const showcaseContent = {
	title: 'Powering software in all industries',
	subtitle: 'Discover how teams are building with the tldraw SDK.',
	ctaLabel: 'Visit the full showcase',
	ctaUrl: '/showcase',
	items: [
		{
			company: 'ClickUp',
			category: 'Productivity Software',
			description:
				'ClickUp modernized its whiteboard for millions of users, replacing legacy infrastructure with the tldraw SDK.',
			url: '/blog/clickup',
			image: '/images/showcase/clickup.png',
		},
		{
			company: 'Padlet',
			category: 'Education Platform',
			description:
				'When Padlet saw an opportunity for a new whiteboard, they built it with tldraw — and shipped Sandbox in record time.',
			url: '/blog/padlet',
			image: '/images/showcase/padlet.png',
		},
		{
			company: 'Mobbin',
			category: 'Design Platform',
			description:
				'Faced with slow, rigid software, Mobbin used tldraw to build custom tools — faster than off-the-shelf solutions.',
			url: '/blog/mobbin',
			image: '/images/showcase/mobbin.png',
		},
		{
			company: 'Jam',
			category: 'Issue Tracker',
			description:
				'A collaborative bug reporting tool that helps teams capture issues, add context, and share feedback visually.',
			url: '/blog/jam',
			image: '/images/showcase/jam.png',
		},
	],
}

export const whatsInsideContent = {
	title: "What's inside",
	subtitle:
		'The tldraw SDK gives you a production-ready foundation out of the box. Skip the canvas setup and focus on what makes your product unique.',
	items: [
		{
			icon: 'users',
			title: 'Multiplayer collaboration',
			description:
				'Simultaneous editing with instant updates powered by a custom sync engine. User presence including live cursors, viewport following, and cursor chat.',
			url: '/features/composable-primitives/multiplayer-collaboration',
		},
		{
			icon: 'mouse-pointer-click',
			title: 'Selection and transformation',
			description:
				'Full selection logic with interactions for translation, resizing, rotating with nested transforms. Flexible hit-testing using a full geometry system.',
			url: '/features/composable-primitives/selection-and-transformation',
		},
		{
			icon: 'accessibility',
			title: 'User preferences and accessibility',
			description:
				'Theming with built-in dark mode and motion controls. Comprehensive screen reader support, keyboard navigation, and adaptive interfaces.',
			url: '/features/composable-primitives/accessibility',
		},
		{
			icon: 'database',
			title: 'Data management',
			description:
				'Manage state and observe changes with a high-performance signals library and record store. Track events and create side effects.',
			url: '/features/composable-primitives/data-management',
		},
		{
			icon: 'layout-grid',
			title: 'User interface and menus',
			description:
				'Complete user interface library with responsive components including toolbars, menu items, and an OpenGL mini-map.',
			url: '/features/composable-primitives/ui-and-menus',
		},
		{
			icon: 'network',
			title: 'Layout and composition',
			description:
				'Built-in functions for alignment and distribution, a robust reordering system, and full support for drag and drop.',
			url: '/features/composable-primitives/layout-and-composition',
		},
	],
}

export const communityContent = {
	title: 'Join the community',
	stats: [
		{
			value: '45K',
			label: 'Source available on',
			linkText: 'GitHub',
			url: 'https://github.com/tldraw/tldraw',
		},
		{
			value: '72K',
			label: 'followers on',
			linkText: 'X',
			url: 'https://x.com/tldraw',
		},
		{
			value: '115.0K',
			label: 'weekly downloads on',
			linkText: 'npm',
			url: 'https://www.npmjs.com/package/tldraw',
		},
		{
			value: '8.75K',
			label: 'members on',
			linkText: 'Discord',
			url: 'https://discord.tldraw.com/',
		},
	],
}

export const whiteboardKitContent = {
	eyebrow: 'READY-TO-USE WHITEBOARD KIT',
	title: 'Save months of work',
	description:
		'The tldraw SDK gives you a production-ready foundation out of the box. Skip the canvas setup and focus on what makes your product unique.',
	ctaLabel: 'Learn More',
	ctaUrl: '/features/out-of-the-box-whiteboard',
	features: [
		{
			title: 'Professional canvas tools',
			description:
				'All the essential tools like drawing, shapes, text or Arrows are already built in.',
		},
		{
			title: 'Precise navigation',
			description: 'State of the art navigation and camera controls for smooth scrolling.',
		},
		{
			title: 'Endless customization',
			description: 'Add your own custom shapes, tools and customize the entire UI.',
		},
	],
}

export const starterKitsContent = {
	title: 'Starter kits',
	subtitle: 'Get up and running with our premade starter kits.',
	ctaLabel: 'See all',
	ctaUrl: '/starter-kits/overview',
	kits: [
		{
			title: 'Multiplayer starter kit',
			description:
				'Self-hosted tldraw with real-time multiplayer collaboration built with Cloudflare Durable Objects. Production-ready backend that handles WebSocket connections, automatic persistence, and asset management. The same architecture that powers hundreds of thousands of collaborative sessions on tldraw.com.',
			url: '/starter-kits/multiplayer',
		},
		{
			title: 'Workflow starter kit',
			description:
				'A drag-and-drop workflow builder with custom shape tools, connectors, and a properties panel. Build visual programming interfaces, flowcharts, and node-based editors.',
			url: '/starter-kits/workflow',
		},
		{
			title: 'Chat starter kit',
			description:
				'A collaborative chat interface built on the tldraw canvas. Spatial conversations with threads, reactions, and real-time updates.',
			url: '/starter-kits/chat',
		},
	],
}

export const testimonialContent = {
	featured: {
		quote:
			"tldraw's technology enabled us to deliver a high-quality foundation and also develop native functionality ourselves. The technology and team have been great to work with.",
		author: 'Zach Blodgett',
		role: 'Staff Product Manager',
		company: 'ClickUp',
	},
	caseStudies: [
		{
			company: 'ClickUp',
			description:
				'ClickUp modernized its whiteboard for millions of users, replacing legacy infrastructure with the tldraw SDK.',
			url: '/blog/clickup',
		},
		{
			company: 'Mobbin',
			description:
				'Faced with slow, rigid software, Mobbin used tldraw to build custom tools, faster than off-the-shelf solutions.',
			url: '/blog/mobbin',
		},
		{
			company: 'Padlet',
			description:
				'When Padlet saw an opportunity for a new whiteboard, they built it with tldraw — and shipped Sandbox in record time.',
			url: '/blog/padlet',
		},
	],
}

export const finalCtaContent = {
	title: 'The $5M canvas',
	description:
		"We've spent three years and five million dollars building thousands of table-stakes features, from rotating cursors to handling pasted images. Take the work and make something incredible.",
	descriptionBold: 'Take the work and make something incredible.',
	ctaPrimary: { label: 'npm create tldraw', url: '/quick-start', variant: 'code' as const },
	ctaSecondary: {
		label: 'or talk to sales',
		labelBold: 'talk to sales',
		url: '/get-a-license/plans',
	},
}

// Navigation data used by header and mobile menu
export const navGroups = [
	{
		label: 'Product',
		items: [
			{ label: 'Whiteboard', href: '/features/out-of-the-box-whiteboard' },
			{ label: 'Features', href: '/features' },
			{ label: 'Starter kits', href: '/starter-kits/overview' },
			{ label: 'Showcase', href: '/showcase' },
		],
	},
	{
		label: 'Developers',
		items: [
			{ label: 'Documentation', href: '/quick-start' },
			{ label: 'Quick start guides', href: '/quick-start' },
			{ label: 'Starter kits', href: '/starter-kits/overview' },
			{ label: 'Examples', href: '/examples' },
			{ label: 'Releases', href: '/releases' },
			{ label: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
			{ label: 'Discord', href: 'https://discord.tldraw.com/' },
		],
	},
	{
		label: 'Resources',
		items: [
			{ label: 'FAQ', href: '/faq' },
			{ label: 'Blog', href: '/blog' },
			{ label: 'Showcase', href: '/showcase' },
			{ label: 'Videos', href: '/blog/events' },
			{ label: 'Careers', href: '/careers' },
			{ label: 'Company', href: '/company' },
			{ label: 'Contact sales', href: '/get-a-license/plans' },
			{ label: 'Become a partner', href: '/partner' },
		],
	},
]

export const standaloneNavLinks = [
	{ label: 'Showcase', href: '/showcase' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'Blog', href: '/blog' },
	{ label: 'Docs', href: 'https://tldraw.dev/docs' },
]

export const footerData = {
	tagline: 'The infinite canvas SDK',
	columns: [
		{
			heading: 'Product',
			links: [
				{ label: 'Whiteboard', href: '/features/out-of-the-box-whiteboard' },
				{ label: 'Pricing', href: '/pricing' },
				{ label: 'FAQ', href: '/faq' },
			],
		},
		{
			heading: 'Developers',
			links: [
				{ label: 'Quick start', href: '/quick-start' },
				{ label: 'Starter kits', href: '/starter-kits/overview' },
				{ label: 'Examples', href: '/examples/basic' },
				{ label: 'Releases', href: '/releases' },
				{ label: 'Docs', href: '/quick-start' },
			],
		},
		{
			heading: 'Community',
			links: [
				{ label: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
				{ label: 'Discord', href: 'https://discord.tldraw.com/' },
				{ label: 'X', href: 'https://x.com/tldraw' },
				{ label: 'LinkedIn', href: 'https://www.linkedin.com/company/tldraw' },
				{ label: 'Bluesky', href: 'https://bsky.app/profile/tldraw.com' },
				{ label: 'Mastodon', href: 'https://mas.to/@tldraw' },
			],
		},
		{
			heading: 'Company',
			links: [
				{ label: 'Careers', href: '/careers' },
				{ label: 'Videos', href: '/blog/events' },
				{ label: 'License', href: '/community/license' },
				{ label: 'Trademark', href: '/legal/trademark-guidelines' },
				{ label: 'CLA', href: '/legal/contributor-license-agreement' },
			],
		},
	],
	socialLinks: [
		{ label: 'GitHub', href: 'https://github.com/tldraw' },
		{ label: 'Discord', href: 'https://discord.tldraw.com/' },
		{ label: 'X', href: 'https://x.com/tldraw' },
		{ label: 'LinkedIn', href: 'https://www.linkedin.com/company/tldraw' },
	],
}

import { cn } from '@/utils/cn'

// Content definitions
const KITS = {
	multiplayer: {
		items: [
			{
				title: 'Collaborative whiteboards',
				desc: 'Real-time drawing and diagramming tools where multiple users can contribute simultaneously.',
			},
			{
				title: 'Educational canvases',
				desc: 'Shared learning environments for remote teaching, brainstorming, and visual collaboration.',
			},
			{
				title: 'Design review platforms',
				desc: 'Interactive design collaboration spaces with persistent sessions and asset sharing.',
			},
			{
				title: 'Project planning tools',
				desc: 'Visual project management interfaces with real-time updates across team members.',
			},
			{
				title: 'Interactive documentation',
				desc: 'Living documents that teams can annotate and modify together in real-time.',
			},
		],
	},
	agent: {
		items: [
			{
				title: 'Visual AI assistants',
				desc: 'Create AI agents that can read, interpret, and modify drawings while providing analysis, insights, and automated annotations.',
			},
			{
				title: 'Diagram generation tools',
				desc: 'Build systems that automatically generate flowcharts, system architecture diagrams, or technical illustrations from text descriptions.',
			},
			{
				title: 'Shape recognition systems',
				desc: 'Develop applications that identify and classify hand-drawn shapes, converting sketches into structured digital content.',
			},
		],
	},
	workflow: {
		items: [
			{
				title: 'AI and agentic workflows',
				desc: 'Build visual AI pipelines where agents process data through connected nodes.',
			},
			{
				title: 'Automation platforms',
				desc: 'Create no-code automation tools where users visually connect services and data transformations.',
			},
			{
				title: 'Data processing pipelines',
				desc: 'Design ETL tools where users drag nodes to transform, filter, and route data between sources and destinations.',
			},
			{
				title: 'Visual programming interfaces',
				desc: 'Build domain-specific scripting environments where complex logic becomes intuitive drag-and-drop workflows.',
			},
			{
				title: 'Interactive diagramming tools',
				desc: 'Create specialized diagram builders for database design, circuit boards, or business process flows with executable functionality.',
			},
		],
	},
	chat: {
		items: [
			{
				title: 'AI chat apps',
				desc: 'Add visual context to conversational AI by letting users sketch diagrams, annotate screenshots, and draw concepts to supplement text conversations.',
			},
			{
				title: 'Design feedback apps',
				desc: 'Add annotation to your design review tools so teams can mark up mockups, wireframes, and prototypes within chat conversations.',
			},
			{
				title: 'Educational platforms',
				desc: 'Add drawing capabilities to tutoring interfaces so students can sketch math problems, create diagrams, and get visual help.',
			},
			{
				title: 'Documentation systems',
				desc: 'Add visual markup to help desk or support chat so users can annotate screenshots and create flowcharts.',
			},
			{
				title: 'Content creation tools',
				desc: 'Add sketching and annotation to creative collaboration platforms so teams can mark up references and brainstorm visually.',
			},
		],
	},
	branching: {
		items: [
			{
				title: 'Interactive chatbots',
				desc: 'Create conversational AI interfaces with multiple dialogue paths where users can explore different response branches and see how conversations evolve in different directions.',
			},
			{
				title: 'Conversation design tools',
				desc: 'Build visual prototyping environments for UX designers to map out chatbot flows, customer service scripts, or user interaction patterns before implementation.',
			},
			{
				title: 'Interactive storytelling',
				desc: 'Develop choose-your-own-adventure applications where narrative branches visually connect, allowing readers to see story paths and backtrack through different choices.',
			},
			{
				title: 'Training simulations',
				desc: 'Create educational tools with branching scenarios for customer service training, medical diagnosis practice, or sales conversation rehearsal with AI-powered responses.',
			},
			{
				title: 'AI agent workflows',
				desc: 'Design complex AI assistant interfaces where conversation history and context branch based on user choices, enabling sophisticated multi-turn dialogue management.',
			},
		],
	},
	shader: {
		items: [
			{
				title: 'Immersive creative tools',
				desc: 'Layer animated, touch-responsive backgrounds behind your drawing UI for design or storytelling apps.',
			},
			{
				title: 'Data-rich dashboards',
				desc: 'Highlight state changes or live metrics using GPU-driven gradients and particle systems that react to editor data.',
			},
			{
				title: 'Games and interactive experiences',
				desc: 'Combine tldraw shapes with shader-based effects to build puzzle overlays, interactive maps, or ambient scenes.',
			},
			{
				title: 'Live events and streaming overlays',
				desc: 'Drive real-time graphics for broadcast overlays or virtual stages that react to presenter actions.',
			},
			{
				title: 'Educational demos',
				desc: 'Teach graphics concepts with interactive examples that expose shader parameters through the config panel.',
			},
		],
	},
} as const

export type StarterKitType = keyof typeof KITS

export function StarterKitBento({
	type,
	href,
	img,
}: {
	type: StarterKitType
	href: string
	img?: { src: string; alt?: string }
}) {
	const content = KITS[type]
	if (!content) return null

	return (
		<div className="my-8 rounded-xl border border-zinc-200 bg-zinc-100 p-2 shadow-sm not-prose">
			{img && (
				<a
					href={href}
					className="block relative mb-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
				>
					<img src={img.src} alt={img.alt || type} className="!my-0 h-auto w-full object-cover" />
				</a>
			)}

			<div className="grid grid-cols-1 gap-2 md:grid-cols-6">
				{content.items.map((item, i) => {
					const span = i < 3 ? 2 : 3

					return <BentoItem key={item.title} title={item.title} span={span} desc={item.desc} />
				})}
			</div>
		</div>
	)
}

function BentoItem({ title, desc, span }: { title: string; desc: string; span: number }) {
	const colSpan =
		{
			2: 'md:col-span-2',
			3: 'md:col-span-3',
		}[span] || 'md:col-span-2'

	return (
		<div
			className={cn(
				'flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md',
				colSpan
			)}
		>
			<div>
				<h3 className="mb-2 text-lg font-bold leading-tight text-zinc-900">{title}</h3>
				<p className="text-sm leading-relaxed text-zinc-600">{desc}</p>
			</div>
		</div>
	)
}

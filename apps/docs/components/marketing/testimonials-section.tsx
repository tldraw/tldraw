import Link from 'next/link'
import { Icon, IconName } from '../common/icon'
import { Section } from './section'
import { SectionHeading } from './section-heading'

const socialLinks = [
	{
		caption: 'Twitter',
		icon: 'twitter' as IconName,
		href: 'https://x.com/tldraw/',
	},
	{
		caption: 'Discord',
		icon: 'discord' as IconName,
		href: 'https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=sociallink',
	},
	{
		caption: 'GitHub',
		icon: 'github' as IconName,
		href: 'https://github.com/tldraw/tldraw',
	},
]

export function TestimonialsSection() {
	return (
		<Section className="bg-zinc-50 dark:bg-zinc-900 py-24 sm:py-24 md:py-32 lg:py-40 max-w-full">
			<SectionHeading
				subheading="Community"
				heading="Friends of the draw"
				description={
					<>
						39,000 <Link href="https://github.com/tldraw">GitHub stars</Link>. 66,000 followers on{' '}
						<Link href="https://x.com/tldraw">Twitter/X</Link>. Join the 8,000 strong community on{' '}
						<Link href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=sociallink">
							Discord
						</Link>
						.
					</>
				}
			/>
			<ul className="flex gap-6 items-center justify-center">
				{socialLinks.map((item, index) => (
					<li key={index}>
						<SocialLink {...item} />
					</li>
				))}
			</ul>
			{/* <div className="flow-root px-5 md:px-0 relative">
				<div className="-mt-8 sm:columns-2 lg:columns-3 gap-8">
					{testimonials.map(({ name, role, avatar, quote }, index) => (
						<div key={index} className="pt-8 sm:inline-block sm:w-full">
							<figure className="rounded-2xl bg-zinc-50 p-5 sm:p-8">
								<figcaption className="flex items-center gap-3 mb-4">
									<div className="size-10 rounded-full relative overflow-hidden">
										<Image src={avatar} alt={name} fill className="object-cover object-center" />
									</div>
									<div className="leading-none">
										<div className="font-semibold text-black mb-1">{name}</div>
										<div>{role}</div>
									</div>
								</figcaption>
								<blockquote>
									<p>{quote}</p>
								</blockquote>
							</figure>
						</div>
					))}
				</div>
			</div> */}
		</Section>
	)
}

const _testimonials: {
	name: string
	role: string
	avatar: string
	quote: string
}[] = [
	{
		name: 'Matt Palmer',
		role: 'Developer Relations at Replit',
		avatar: '/testimonial/matt_palmer.jpg',
		quote: 'The @tldraw docs are excellent',
	},
	{
		name: 'Ryan Mather',
		role: 'Poetry Camera',
		avatar: '/testimonial/ryan_mather.jpg',
		quote: "these cats can't stop cooking",
	},
	{
		name: 'Justin Duke',
		role: 'Developer at Pimento',
		avatar: 'https://i.pravatar.cc/300?img=2',
		quote:
			'I am using the new @tldraw beta for an upcoming essay on replicating state space and it is a delightful tool for architecture diagrams. Highly recommend.',
	},
	{
		name: 'Foda',
		role: 'Founder at Framer',
		avatar: 'https://i.pravatar.cc/300?img=3',
		quote: 'drawing on @tldraw from ipad browser to updates on computer. pretty fun vibe.',
	},
	{
		name: 'Cristian Perez Jensen',
		role: 'Designer at Apple',
		avatar: 'https://i.pravatar.cc/300?img=4',
		quote: `Currently making a Bezier tool for my figure editor built with @tldraw. It's looking pretty good so far, just some bugs to work out and some more features, like different types of knots and being able to add control points to knots without them. :-)`,
	},
	{
		name: 'Yonatan',
		role: 'Student at Harvard',
		avatar: 'https://i.pravatar.cc/300?img=5',
		quote:
			'Props on @tldraw gave it a try, and I loved it.  Especially when it auto-detected the eraser when I flipped my stylus.  I had fun building the below for @getAllSpark.',
	},
	{
		name: 'Will Taylor',
		role: 'Developer at Facebook',
		avatar: 'https://i.pravatar.cc/300?img=6',
		quote: '@tldraw is the best whiteboard. Change my mind.',
	},
	{
		name: 'Foda',
		role: 'Founder at Framer',
		avatar: 'https://i.pravatar.cc/300?img=7',
		quote: 'drawing on @tldraw from ipad browser to updates on computer. pretty fun vibe.',
	},
	{
		name: 'Justin Duke',
		role: 'Developer at Pimento',
		avatar: 'https://i.pravatar.cc/300?img=8',
		quote:
			'I am using the new @tldraw beta for an upcoming essay on replicating state space and it is a delightful tool for architecture diagrams. Highly recommend.',
	},
	{
		name: 'Yonatan',
		role: 'Student at Harvard',
		avatar: 'https://i.pravatar.cc/300?img=9',
		quote:
			'Props on @tldraw gave it a try, and I loved it.  Especially when it auto-detected the eraser when I flipped my stylus.  I had fun building the below for @getAllSpark.',
	},
]

function SocialLink({ caption, icon, href }: { caption: string; icon: IconName; href: string }) {
	return (
		<Link href={href} target="_blank" rel="noreferrer">
			<span className="sr-only">{caption}</span>
			<Icon
				icon={icon}
				className="h-10 text-black dark:text-white hover:text-zinc-600 dark:hover:text-zinc-100"
			/>
		</Link>
	)
}

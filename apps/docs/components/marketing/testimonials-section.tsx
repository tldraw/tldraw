import Image from 'next/image'
import { Section } from './section'
import { SectionHeading } from './section-heading'

export function TestimonialsSection() {
	return (
		<Section>
			<SectionHeading
				subheading="Testimonials"
				heading="Friends of the draw"
				description="34,000+ GitHub stars. 60,000 followers on X. Join the 5,000+ strong community on Discord."
			/>
			<div className="flow-root px-5 md:px-0 relative">
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
				{/* Mailing list */}
			</div>
		</Section>
	)
}

const testimonials = [
	{
		name: 'Alasdair Monk',
		role: 'Developer at Github',
		avatar: 'https://i.pravatar.cc/300?img=1',
		quote:
			'p much hands down my favourite tool right now is @tldraw – perfect level of fidelity for multiplayer whiteboarding',
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

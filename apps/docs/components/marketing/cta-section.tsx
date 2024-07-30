import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '../common/button'

export const CTASection = () => {
	return (
		<Section className="pb-24 md:pb-32 lg:pb-40">
			<SectionHeading
				subheading="Get Started"
				heading="Ship a Whiteboard Today"
				description="Jump into the docs to learn how to integrate tldraw into your products within just a few minutes."
			/>
			<div className="flex items-center gap-3 justify-center -mt-6 mb-12">
				<ul className="flex">
					{avatars.map((avatar, index) => (
						<li
							key={index}
							className="relative size-8 sm:size-10 border-2 border-white rounded-full overflow-hidden -ml-2 first-of-type:ml-0"
						>
							<Image
								src={avatar}
								alt={`Tldraw user ${index}`}
								fill
								className="object-cover object-center"
							/>
						</li>
					))}
				</ul>
				<div className="max-w-32 leading-tight text-xs sm:max-w-40 sm:text-sm sm:leading-tight">
					Loved by <span className="text-black font-semibold">5000+</span> developers and users.
				</div>
			</div>
			<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
				<Button href="/quick-start" caption="Get Started" size="lg" type="black" />
				<div>
					or{' '}
					<Link href="#pricing" className="font-semibold text-blue-500 hover:text-blue-600">
						request a commercial license
					</Link>
				</div>
			</div>
		</Section>
	)
}

const avatars = [
	'https://i.pravatar.cc/300?img=1',
	'https://i.pravatar.cc/300?img=2',
	'https://i.pravatar.cc/300?img=3',
	'https://i.pravatar.cc/300?img=4',
	'https://i.pravatar.cc/300?img=5',
]

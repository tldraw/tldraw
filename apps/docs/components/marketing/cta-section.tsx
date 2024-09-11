import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Button } from '../common/button'

export function CTASection() {
	return (
		<Section className="pb-24 md:pb-32 lg:pb-40">
			<SectionHeading
				heading="Get started today"
				subheading="to action"
				description="Follow our quick start guide and build something today with the tldraw SDK."
			/>
			{/* <div className="flex items-center justify-center gap-3 mb-12 -mt-6">
                <ul className="flex">
                    {avatars.map((avatar, index) => (
                        <li
                            key={index}
                            className="relative -ml-2 overflow-hidden border-2 border-white rounded-full size-8 sm:size-10 first-of-type:ml-0"
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
                <div className="text-xs leading-tight max-w-32 sm:max-w-40 sm:text-sm sm:leading-tight">
                    Loved by <span className="font-semibold text-black">5000+</span> developers and users.
                </div>
            </div> */}
			<div className="flex flex-col items-center justify-center gap-4 -mt-4">
				<div className="flex flex-row items-center justify-center gap-4">
					<Button href="/quick-start" caption="Read the docs" type="black" />
					<Button
						href="https://tldraw.com"
						caption="Try the app"
						type="tertiary"
						icon="play"
						newTab
					/>
				</div>
				{/* <Link
                href="https://forms.gle/PmS4wNzngnbD3fb89"
                className="font-semibold text-blue-500 hover:text-blue-600"
                target="_blank"
                rel="noopener noreferrer"
            >
                Ask about a commercial license
            </Link> */}
			</div>
		</Section>
	)
}

// const avatars = [
// 	'https://i.pravatar.cc/300?img=1',
// 	'https://i.pravatar.cc/300?img=2',
// 	'https://i.pravatar.cc/300?img=3',
// 	'https://i.pravatar.cc/300?img=4',
// 	'https://i.pravatar.cc/300?img=5',
// ]

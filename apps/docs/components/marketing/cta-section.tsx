import { Section } from '@/components/marketing/section'
import { Button } from '../common/button'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

export function CTASection() {
	return (
		<Section>
			<SectionTitle>Get started today</SectionTitle>
			<SectionSubtitle>
				Follow our quick start guide and build something today with the tldraw SDK.
			</SectionSubtitle>
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
					<Button
						id="hero-quick-start"
						href="/quick-start"
						caption="Read the quick start guide"
						type="black"
					/>
					<Button
						id="hero-discord"
						href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=sociallink"
						caption="Join the Discord"
					/>
				</div>
			</div>
			<div className="h-12" />
		</Section>
	)
}

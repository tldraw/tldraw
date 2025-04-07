import { Section } from '@/components/marketing/section'
import Link from 'next/link'
import { BlueA } from '../common/blue-a'
import { DisclosureToggle } from './DisclosureToggle'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

export function FAQSection() {
	return (
		<Section id="faq" className="max-w-full w-lg">
			<SectionTitle>Frequently Asked Questions</SectionTitle>
			<SectionSubtitle>
				Have more questions?{' '}
				<Link href="mailto:hello@tldraw.com" className="text-blue-500 hover:text-blue-600">
					Contact us
				</Link>{' '}
				and we’ll respond as quickly as possible.
			</SectionSubtitle>
			<div className="px-8 w-full max-w-2xl mx-auto">
				{faq.map(({ q, a }, index) => (
					<DisclosureToggle key={index} q={q} a={a} index={index} />
				))}
			</div>
		</Section>
	)
}

const faq = [
	{
		q: 'Is the tldraw SDK free to use?',
		a: (
			<>
				You can use the tldraw SDK for free in commercial or non-commercial contexts so long as the
				watermark is present. If you want to remove the watermark, you can purchase a license from
				us. See our <BlueA href="/legal/tldraw-license">license</BlueA> and{' '}
				<BlueA href="#pricing">pricing</BlueA> sections for more information.
			</>
		),
	},
	{
		q: 'Is the tldraw SDK open source?',
		a: (
			<>
				You can view the source code on{' '}
				<BlueA href="https://github.com/tldraw/tldraw">GitHub</BlueA>. We accept contributions from
				the community and work in public. Our <BlueA href="/legal/tldraw-license">license</BlueA> is
				not exactly <BlueA href="https://opensource.org/osd">Open Source</BlueA> but the library is
				free to use with our watermark.
			</>
		),
	},
	{
		q: 'How can I get help and support with the tldraw SDK?',
		a: (
			<>
				The best place for community support is either{' '}
				<BlueA href="https://github.com/tldraw/tldraw">GitHub</BlueA> or{' '}
				<BlueA href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=faq">
					Discord
				</BlueA>
				.
			</>
		),
	},
	{
		q: 'Where can I find examples of apps built with the tldraw SDK?',
		a: (
			<>
				Check out the #show-and-tell channel on our{' '}
				<BlueA href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=faq">
					Discord
				</BlueA>{' '}
				community.
			</>
		),
	},
	{
		q: 'What is the difference between tldraw.com and the tldraw SDK?',
		a: (
			<>
				The <BlueA href="https://tldraw.com">tldraw.com</BlueA> website is a big free demo of the
				tldraw SDK. The source for both projects is available on our{' '}
				<BlueA href="https://github.com/tldraw/tldraw">GitHub</BlueA>. You can use tldraw.com at
				work or for personal projects.
			</>
		),
	},
	{
		q: 'How do I request a feature for tldraw?',
		a: (
			<>
				You can request features through our{' '}
				<BlueA href="https://github.com/tldraw/tldraw">GitHub</BlueA> or in our{' '}
				<BlueA href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=faq">
					Discord
				</BlueA>
				.
			</>
		),
	},
	{
		q: 'Can I use the tldraw SDK in a commercial application?',
		a: (
			<>
				Yes, you can use the SDK for free in commercial or non-commercial contexts so long as the
				watermark is present. If you want to remove the watermark, you can
				<BlueA href="#pricing">purchase</BlueA> a license from us.
			</>
		),
	},
	{
		q: 'How do I get rid of the watermark?',
		a: (
			<>
				You can remove the watermark by <BlueA href="#pricing">purchasing a license</BlueA> from us.
				We will send you a{' '}
				<BlueA
					href="https://tldraw.notion.site/License-keys-in-tldraw-e5e8566857f64a709ef23ab30336e66c
"
				>
					license key
				</BlueA>{' '}
				that you can use to remove the watermark. If you want to use the SDK for free, you have to
				keep the watermark as it is. See our <BlueA href="#pricing">pricing</BlueA> for more
				information.
			</>
		),
	},
	{
		q: 'Does the SDK collect diagnostics?',
		a: (
			<>
				We collect anonymous usage information in two ways: from requests for our static assets
				(such as our default fonts, icons and watermark), and from our watermark. If you{' '}
				<BlueA href="/installation#Static-Assets">self-host</BlueA> all static assets and have a
				license to remove the watermark then all no external requests are made.
			</>
		),
	},
	{
		q: 'Can I use tldraw in frameworks other than React?',
		a: (
			<>
				Yes, though your app will have to embed React for the component. The SDK uses React for
				rendering only, and most of the tldraw SDK is regular TypeScript. If you would like to have
				first-class support for alternative renderers such as Svelte or Vue, please let us know on
				the{' '}
				<BlueA href="https://discord.tldraw.com/?utm_source=docs&utm_medium=organic&utm_campaign=faq">
					Discord
				</BlueA>
				.
			</>
		),
	},
	{
		q: 'Where can I find the AI stuff?',
		a: (
			<>
				You can try our <BlueA href="https://makereal.tldraw.com">Make Real</BlueA> for drawing user
				interfaces with tldraw. We also have <BlueA href="https://teach.tldraw.com">Teach</BlueA>{' '}
				for working with an AI on the canvas. And we have{' '}
				<BlueA href="https://computer.tldraw.com">Computer</BlueA> for building AI-powered
				workflows. Follow us on <BlueA href="https://x.com/tldraw">X/Twitter</BlueA> for the latest!
			</>
		),
	},
]

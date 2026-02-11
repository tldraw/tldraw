import { urlFor } from '@/sanity/image'
import Image from 'next/image'

interface CoverImageProps {
	image: { asset: { _ref: string } }
	alt: string
}

export function CoverImage({ image, alt }: CoverImageProps) {
	return (
		<section className="pb-12 sm:pb-16">
			<div className="mx-auto max-w-content px-5 sm:px-8">
				<Image
					src={urlFor(image).width(1200).height(630).url()}
					alt={alt}
					width={1200}
					height={630}
					className="rounded-lg"
					priority
				/>
			</div>
		</section>
	)
}

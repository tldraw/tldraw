import Image from 'next/image'

interface CoverImageProps {
	src: string
	alt: string
}

export function CoverImage({ src, alt }: CoverImageProps) {
	return (
		<section className="pb-12 sm:pb-16">
			<div className="max-w-content mx-auto px-5 sm:px-8">
				<Image src={src} alt={alt} width={1200} height={630} className="rounded-md" priority />
			</div>
		</section>
	)
}

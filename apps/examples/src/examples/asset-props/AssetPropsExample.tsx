import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function AssetPropsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// only allow jpegs
				acceptedImageMimeTypes={['image/jpeg']}
				// don't allow any images
				acceptedVideoMimeTypes={[]}
				// accept images of any dimension
				maxImageDimension={Infinity}
				// ...but only accept assets up to 1mb
				maxAssetSize={1 * 1024 * 1024}
			/>
		</div>
	)
}

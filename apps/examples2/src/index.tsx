import { getBundlerAssetUrls } from '@tldraw/assets'
import { setDefaultAssetUrls } from '@tldraw/tldraw'
import { ComponentType } from 'react'

type Example = {
	name: string
	description: string
	route: string
	component: ComponentType
}

setDefaultAssetUrls(getBundlerAssetUrls())

export const allExamples: Example[] = []

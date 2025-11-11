import {
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	TLEditorComponents,
	TLOnMountHandler,
	TLTextOptions,
	TldrawEditor,
	TldrawEditorBaseProps,
	TldrawEditorStoreProps,
	defaultUserPreferences,
	mergeArraysAndReplaceDefaults,
	useEditor,
	useEditorComponents,
	useOnMount,
	useShallowArrayIdentity,
	useShallowObjectIdentity,
} from '@tldraw/editor'
import { useMemo } from 'react'
import { TldrawHandles } from './canvas/TldrawHandles'
import { TldrawOverlays } from './canvas/TldrawOverlays'
import { TldrawScribble } from './canvas/TldrawScribble'
import { TldrawSelectionForeground } from './canvas/TldrawSelectionForeground'
import { TldrawShapeIndicators } from './canvas/TldrawShapeIndicators'
import { defaultBindingUtils } from './defaultBindingUtils'
import { TLEmbedDefinition } from './defaultEmbedDefinitions'
import {
	TLExternalContentProps,
	registerDefaultExternalContentHandlers,
} from './defaultExternalContentHandlers'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { registerDefaultSideEffects } from './defaultSideEffects'
import { defaultTools } from './defaultTools'
import { EmbedShapeUtil } from './shapes/embed/EmbedShapeUtil'
import { allDefaultFontFaces } from './shapes/shared/defaultFonts'
import { TldrawUi, TldrawUiInFrontOfTheCanvas, TldrawUiProps } from './ui/TldrawUi'
import { TLUiAssetUrlOverrides, useDefaultUiAssetUrlsWithOverrides } from './ui/assetUrls'
import { LoadingScreen } from './ui/components/LoadingScreen'
import { Spinner } from './ui/components/Spinner'
import { AssetUrlsProvider } from './ui/context/asset-urls'
import { TLUiComponents, useTldrawUiComponents } from './ui/context/components'
import { useUiEvents } from './ui/context/events'
import { useToasts } from './ui/context/toasts'
import {
	TldrawUiTranslationProvider,
	useTranslation,
} from './ui/hooks/useTranslation/useTranslation'
import { useMergedTranslationOverrides } from './ui/overrides'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'
import { defaultAddFontsFromNode, tipTapDefaultExtensions } from './utils/text/richText'

/**
 * Override the default react components used by the editor and UI. Set components to null to
 * disable them entirely.
 *
 * @example
 * ```tsx
 * import {Tldraw, TLComponents} from 'tldraw'
 *
 * const components: TLComponents = {
 *    Scribble: MyCustomScribble,
 * }
 *
 * export function MyApp() {
 *   return <Tldraw components={components} />
 * }
 * ```
 *
 *
 * @public
 */
export interface TLComponents extends TLEditorComponents, TLUiComponents {}

/** @public */
export interface TldrawBaseProps
	extends TldrawUiProps,
		TldrawEditorBaseProps,
		TLExternalContentProps {
	/** Urls for custom assets.
	 *
	 * ⚠︎ Important! This must be memoized (with useMemo) or defined outside of any React component.
	 */
	assetUrls?: TLUiAssetUrlOverrides
	/** Overrides for tldraw's components.
	 *
	 * ⚠︎ Important! This must be memoized (with useMemo) or defined outside of any React component.
	 */
	components?: TLComponents
	/** Custom definitions for tldraw's embeds.
	 *
	 * ⚠︎ Important! This must be memoized (with useMemo) or defined outside of any React component.
	 */
	embeds?: TLEmbedDefinition[]
}

/** @public */
export type TldrawProps = TldrawBaseProps & TldrawEditorStoreProps

const allDefaultTools = [...defaultTools, ...defaultShapeTools]

/** @public @react */
export function Tldraw(props: TldrawProps) {
	const {
		children,
		maxImageDimension,
		maxAssetSize,
		acceptedImageMimeTypes,
		acceptedVideoMimeTypes,
		onMount,
		components = {},
		shapeUtils = [],
		bindingUtils = [],
		tools = [],
		embeds,
		textOptions,
		...rest
	} = props

	const _components = useShallowObjectIdentity(components)

	const CustomInFrontOfTheCanvas = components?.InFrontOfTheCanvas
	const InFrontOfTheCanvas = useMemo(() => {
		if (rest.hideUi) return CustomInFrontOfTheCanvas ?? null
		if (!CustomInFrontOfTheCanvas) return TldrawUiInFrontOfTheCanvas

		return () => (
			<>
				<TldrawUiInFrontOfTheCanvas />
				<CustomInFrontOfTheCanvas />
			</>
		)
	}, [rest.hideUi, CustomInFrontOfTheCanvas])
	const componentsWithDefault = useMemo(
		() => ({
			Scribble: TldrawScribble,
			ShapeIndicators: TldrawShapeIndicators,
			CollaboratorScribble: TldrawScribble,
			SelectionForeground: TldrawSelectionForeground,
			Handles: TldrawHandles,
			Overlays: TldrawOverlays,
			Spinner,
			LoadingScreen,
			..._components,
			InFrontOfTheCanvas,
		}),
		[_components, InFrontOfTheCanvas]
	)

	const _shapeUtils = useShallowArrayIdentity(shapeUtils)
	const shapeUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _shapeUtils, defaultShapeUtils),
		[_shapeUtils]
	)

	const _bindingUtils = useShallowArrayIdentity(bindingUtils)
	const bindingUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _bindingUtils, defaultBindingUtils),
		[_bindingUtils]
	)

	const _tools = useShallowArrayIdentity(tools)
	const toolsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('id', _tools, allDefaultTools),
		[_tools]
	)

	const _imageMimeTypes = useShallowArrayIdentity(
		acceptedImageMimeTypes ?? DEFAULT_SUPPORTED_IMAGE_TYPES
	)
	const _videoMimeTypes = useShallowArrayIdentity(
		acceptedVideoMimeTypes ?? DEFAULT_SUPPORT_VIDEO_TYPES
	)

	const textOptionsWithDefaults = useMemo((): TLTextOptions => {
		return {
			addFontsFromNode: defaultAddFontsFromNode,
			...textOptions,
			tipTapConfig: {
				extensions: tipTapDefaultExtensions,
				...textOptions?.tipTapConfig,
			},
		}
	}, [textOptions])

	const mediaMimeTypes = useMemo(
		() => [..._imageMimeTypes, ..._videoMimeTypes],
		[_imageMimeTypes, _videoMimeTypes]
	)

	const assets = useDefaultEditorAssetsWithOverrides(rest.assetUrls)

	const embedShapeUtil = shapeUtilsWithDefaults.find((util) => util.type === 'embed')
	if (embedShapeUtil && embeds) {
		EmbedShapeUtil.setEmbedDefinitions(embeds)
	}

	return (
		// We provide an extra higher layer of asset+translations providers here so that
		// loading UI (which is rendered outside of TldrawUi) may be translated.
		// Ideally we would refactor to hoist all the UI context providers we can up here. Maybe later.
		<AssetUrlsProvider assetUrls={useDefaultUiAssetUrlsWithOverrides(rest.assetUrls)}>
			<TldrawUiTranslationProvider
				overrides={useMergedTranslationOverrides(rest.overrides)}
				locale={rest.user?.userPreferences.get().locale ?? defaultUserPreferences.locale}
			>
				<TldrawEditor
					initialState="select"
					{...rest}
					components={componentsWithDefault}
					shapeUtils={shapeUtilsWithDefaults}
					bindingUtils={bindingUtilsWithDefaults}
					tools={toolsWithDefaults}
					textOptions={textOptionsWithDefaults}
					assetUrls={assets}
				>
					<TldrawUi {...rest} components={componentsWithDefault} mediaMimeTypes={mediaMimeTypes}>
						<InsideOfEditorAndUiContext
							maxImageDimension={maxImageDimension}
							maxAssetSize={maxAssetSize}
							acceptedImageMimeTypes={_imageMimeTypes}
							acceptedVideoMimeTypes={_videoMimeTypes}
							onMount={onMount}
						/>
						{children}
					</TldrawUi>
				</TldrawEditor>
			</TldrawUiTranslationProvider>
		</AssetUrlsProvider>
	)
}

// We put these hooks into a component here so that they can run inside of the context provided by TldrawEditor and TldrawUi.
function InsideOfEditorAndUiContext({
	maxImageDimension,
	maxAssetSize,
	acceptedImageMimeTypes,
	acceptedVideoMimeTypes,
	onMount,
}: TLExternalContentProps & {
	onMount?: TLOnMountHandler
}) {
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	useOnMount(() => {
		const unsubs: (void | (() => void) | undefined)[] = []

		unsubs.push(registerDefaultSideEffects(editor))

		// now that the editor has mounted (and presumably pre-loaded the fonts actually in use in
		// the document), we want to preload the other default font faces in the background. These
		// won't be directly used, but mean that when adding text the user can switch between fonts
		// quickly, without having to wait for them to load in.
		editor.fonts.requestFonts(allDefaultFontFaces)

		editor.once('edit', () => trackEvent('edit', { source: 'unknown' }))

		// for content handling, first we register the default handlers...
		registerDefaultExternalContentHandlers(editor, {
			maxImageDimension,
			maxAssetSize,
			acceptedImageMimeTypes,
			acceptedVideoMimeTypes,
			toasts,
			msg,
		})

		// ...then we call the store's on mount which may override them...
		unsubs.push(editor.store.props.onMount(editor))

		// ...then we run the user's onMount prop, which may override things again.
		unsubs.push(onMount?.(editor))

		return () => {
			unsubs.forEach((fn) => fn?.())
		}
	})

	const { Canvas } = useEditorComponents()
	const { ContextMenu } = useTldrawUiComponents()

	if (ContextMenu) {
		// should wrap canvas
		return <ContextMenu />
	}

	if (Canvas) {
		return <Canvas />
	}

	return null
}

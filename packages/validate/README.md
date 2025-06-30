## @tldraw/validate

Validation functions used by tldraw.

These are especially useful when used in conjunction with our shapes to validate their [schemas](https://github.com/tldraw/tldraw/tree/main/packages/tlschema).

For example, for [TLImageShape](https://github.com/tldraw/tldraw/blob/main/packages/tlschema/src/shapes/TLImageShape.ts) we have the following to help make sure the properties on a shape are consistent:

```tsx
export const imageShapeProps: RecordProps<TLImageShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
	flipX: T.boolean,
	flipY: T.boolean,
}
```

We also use the validation functions for API requests. For example, to check that the query is valid:

```tsx
const queryValidator = T.object({
	w: T.string.optional(),
	q: T.string.optional(),
})

queryValidator.validate(request.query)
```

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

This project is licensed under the MIT License found [here](https://github.com/tldraw/tldraw/blob/main/packages/utils/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

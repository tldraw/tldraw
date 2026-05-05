## 8. Label props

`PlainTextLabelProps` and `RichTextLabelProps` had three property changes:

| v4         | v5           |
| ---------- | ------------ |
| `font`     | `fontFamily` |
| `align`    | `textAlign`  |
| `fill`     | (removed)    |

Update both the property reads inside your shape `component()` and any object
construction that built these prop bags:

```tsx
// BEFORE
<text
  fontFamily={FONT_FAMILIES[font]}
  textAnchor={align === 'middle' ? 'middle' : 'start'}
  fill={getColorValue(theme, fill, 'semi')}
>

// AFTER
<text
  fontFamily={displayValues.fontFamily}
  textAnchor={textAlign === 'middle' ? 'middle' : 'start'}
  // fill removed: rich text labels now manage color via the theme + display values
>
```

If you were storing label props on a custom shape, also update the validator:

```ts
const validator = T.object<MyShape['props']>({
  text: T.string,
  fontFamily: T.string,         // was `font`
  textAlign: T.literalEnum('start', 'middle', 'end'),  // was `align`
  // fill: removed
})
```

Migration the data on disk: any shape records persisted with `font`/`align`
keys must be normalised on load. Add a store migration:

```ts
// in your shape's `migrations` array
{
  id: createShapePropsMigrationId(MyShapeUtil.type, 1),
  scope: 'record',
  filter: (record) => record.typeName === 'shape' && record.type === MyShapeUtil.type,
  up: (record) => {
    const { font, align, fill, ...rest } = record.props
    record.props = { ...rest, fontFamily: font, textAlign: align }
  },
}
```

## 3. Display values

The constants `FONT_FAMILIES`, `FONT_SIZES`, `LABEL_FONT_SIZES`,
`STROKE_SIZES`, `TEXT_PROPS`, and `ARROW_LABEL_FONT_SIZES` are removed.
Their values are now resolved through the **display values** pipeline so that
themes and color modes can override them per shape.

For custom shape utils, override `getDefaultDisplayValues`:

```tsx
class MyShapeUtil extends ShapeUtil<MyShape> {
  override getDefaultDisplayValues(_editor, _shape, _theme, _colorMode) {
    return {
      fontSize: { s: 12, m: 16, l: 24, xl: 36 }[shape.props.size],
      strokeWidth: { s: 1, m: 2, l: 3, xl: 4 }[shape.props.size],
    }
  }
}
```

For overlay utils, the same method exists and receives:

```ts
getDefaultDisplayValues(
  editor: Editor,
  overlay: Overlay,
  theme: TLTheme,
  colorMode: 'dark' | 'light',
): DisplayValues
```

For *default* shape utils where you want to *augment* (not replace) the
defaults, override `getCustomDisplayValues` with a `Partial<DisplayValues>`
return value.

In a shape's `component` / `indicator` method, read from the display values
object that's passed in by the framework rather than reaching for a constant.

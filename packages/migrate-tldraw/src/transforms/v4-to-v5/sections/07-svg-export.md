## 7. SVG export

`SvgExportContext.themeId` was renamed to `SvgExportContext.colorMode`, and
its type changed from `string` to `'dark' | 'light'`. This affects custom
`ShapeUtil.toSvg()` implementations and any consumer of `Editor.getSvgString`
that inspects the context object.

```tsx
// BEFORE
override toSvg(shape: MyShape, ctx: SvgExportContext) {
  const isDark = ctx.themeId === 'dark'
  const fill = isDark ? '#fff' : '#000'
  return <rect width={shape.props.w} height={shape.props.h} fill={fill} />
}

// AFTER
override toSvg(shape: MyShape, ctx: SvgExportContext) {
  const isDark = ctx.colorMode === 'dark'
  const fill = isDark ? '#fff' : '#000'
  return <rect width={shape.props.w} height={shape.props.h} fill={fill} />
}
```

A `themeId` member access in your code does **not** automatically mean an
`SvgExportContext` — the migration script flags every `.themeId` access and
asks you to verify before renaming. Other types (e.g. theme records in your
own data model) may legitimately use `themeId`.

Other context fields are unchanged: `isDarkMode` is still present (kept for
backwards compatibility in addition to the typed `colorMode`).

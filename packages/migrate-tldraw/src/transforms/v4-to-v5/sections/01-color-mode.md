## 1. Color mode

### `inferDarkMode` → `colorScheme`

The `inferDarkMode` prop on `<Tldraw>` and `<TldrawEditor>` was renamed and its
type changed:

| v4 (`inferDarkMode`)     | v5 (`colorScheme`)              |
| ------------------------ | ------------------------------- |
| `true`                   | `'system'`                      |
| `false`                  | omit prop                       |
| `boolean` (any)          | `'light' \| 'dark' \| 'system'` |

The migration script auto-rewrites the three known-safe forms:

```tsx
<Tldraw inferDarkMode />          // → <Tldraw colorScheme="system" />
<Tldraw inferDarkMode={true} />   // → <Tldraw colorScheme="system" />
<Tldraw inferDarkMode="dark" />   // → <Tldraw colorScheme="dark" />
```

Anything with a non-literal value is flagged for manual review:

```tsx
<Tldraw inferDarkMode={prefersDark} />   // FLAGGED — verify the value type
```

You almost certainly want one of:

```tsx
<Tldraw colorScheme={prefersDark ? 'dark' : 'light'} />
<Tldraw colorScheme="system" />
```

### `useIsDarkMode` → `useColorMode`

The hook was renamed and its **return type changed** from `boolean` to
`'dark' | 'light'`. Truthy checks against the result will silently break:

```tsx
// BEFORE — returns boolean
const isDark = useIsDarkMode()
if (isDark) { ... }                 // ✓ worked
return <Icon dark={isDark} />       // ✓ worked

// AFTER — returns 'dark' | 'light' (both truthy)
const mode = useColorMode()
if (mode) { ... }                   // ✗ always true; 'light' is also truthy
return <Icon dark={mode} />         // ✗ type error: string not boolean

// FIX
const colorMode = useColorMode()
const isDark = colorMode === 'dark'
if (isDark) { ... }
return <Icon dark={isDark} />
```

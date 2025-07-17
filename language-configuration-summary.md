# Tldraw Language Configuration Summary

## Overview
This document summarizes how to set the default language in tldraw editor.

## Default Behavior
By default, tldraw automatically detects the user's language preference from their browser's `navigator.languages` setting. The detection logic:

1. Checks browser languages in order of preference
2. Finds the first supported language from the available translations
3. Falls back to English (`'en'`) if no supported language is found

## Available Languages
Tldraw supports 50+ languages. The complete list is available in the `LANGUAGES` constant from `@tldraw/editor` or `@tldraw/tlschema`.

Some popular language codes:
- `'en'` - English
- `'es'` - Spanish
- `'fr'` - French  
- `'de'` - German
- `'ja'` - Japanese
- `'zh-cn'` - Chinese (Simplified)
- `'pt-br'` - Portuguese (Brazil)
- `'hi-in'` - Hindi
- `'ko-kr'` - Korean

## Setting Default Language

### Method: Custom User Preferences
The recommended way to set a default language is by providing custom user preferences:

```tsx
import { Tldraw, TLUserPreferences, uniqueId, useTldrawUser } from 'tldraw'

function MyTldrawApp() {
  const userPreferences: TLUserPreferences = {
    id: uniqueId(),
    locale: 'es', // Set to Spanish
    // ... other preferences
  }

  const user = useTldrawUser({ userPreferences })

  return <Tldraw user={user} />
}
```

### Key Points
- Use `useTldrawUser` hook to create the user object
- The `locale` property in user preferences controls the language
- All UI text, menus, and interface elements will use the specified language
- Users can still change the language via the help menu if desired

## Example Location
The complete example is located at:
`/apps/examples/src/examples/set-default-language/`

## Related Files
- Language list: `packages/tlschema/src/translations/languages.ts`
- Default detection: `packages/tlschema/src/translations/translations.ts`
- User preferences: `packages/editor/src/lib/config/TLUserPreferences.ts`
- Language menu: `packages/tldraw/src/lib/ui/components/LanguageMenu.tsx`
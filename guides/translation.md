# Translation

Thanks for your interest in translating tldraw! This file has instructions for updating a translation or creating a new translation.

## Update an Existing Translation

Want to update or correct an existing translations?

Create a new branch on Github.

Open the language file in `packages/tldraw/src/translations`

Make whichever changes you like.

Submit your branch as a PR on Github.

## Add a New Translation

Want to add a new language to our translations?

Create a new branch on Github.

In the `packages/tldraw/src/translations` folder, duplicate the `en.json` file. 

Rename the new file to the [language code](https://gist.github.com/wpsmith/7604842) for that language. For example, if you were making an Esperanto translation, name the new file `eo.json`.

In the `packages/tldraw/src/translations/translations.ts` file, import your file and create a new entry in to the `TRANSLATIONS` array like this:

```ts
import ar from './ar.json'
import en from './en.json'
import eo from './eo.json' // +

export const TRANSLATIONS = {
  { code: 'en', label: 'English', messages: en },
  { code: 'ar', label: 'عربي', messages: ar },
  { code: 'eo', label: 'Esperanto', messages: eo }, // +
} as const
```

That's it!

Submit your branch as a PR on Github.

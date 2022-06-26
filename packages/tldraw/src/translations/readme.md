# tldraw Translation Update

tldraw uses [i18next](http://i18next.com) library for translation.
i18next uses separate json files for each language.

## Update Translations for tldraw

The translation of tldraw is handled by manually adding missing keys, and then translate them on the language files.

You can use the `update.js` script as follows to automate a stage of this process:

node update.js es.json

That will cause the `es.json` file to be updated with all the missing keys set as empty strings. You need now to edit the file and replace blank strings with the proper translation!


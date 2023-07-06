# v2.0.0-alpha.14 (Tue Jul 04 2023)

### Release Notes

#### Disable styles panel button on mobile when using the laser tool. ([#1704](https://github.com/tldraw/tldraw/pull/1704))

- Disable the styles panel button for laser tool on mobile.

#### remove lock option from highlighter ([#1703](https://github.com/tldraw/tldraw/pull/1703))

- We no longer show the tool lock option for highlighter - it didn't do anything anyway

#### [fix] Lock shortcut ([#1677](https://github.com/tldraw/tldraw/pull/1677))

- [@tldraw/editor] Fix lock tool shortcut

#### [feature] add `meta` property to records ([#1627](https://github.com/tldraw/tldraw/pull/1627))

- todo

---

#### 🚀 Enhancement

- [feature] add `meta` property to records [#1627](https://github.com/tldraw/tldraw/pull/1627) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Disable styles panel button on mobile when using the laser tool. [#1704](https://github.com/tldraw/tldraw/pull/1704) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- remove lock option from highlighter [#1703](https://github.com/tldraw/tldraw/pull/1703) ([@SomeHats](https://github.com/SomeHats))
- [fix] Lock shortcut [#1677](https://github.com/tldraw/tldraw/pull/1677) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### Styles API follow-ups ([#1636](https://github.com/tldraw/tldraw/pull/1636))

--

#### Revert "Update dependencies (#1613)" ([#1617](https://github.com/tldraw/tldraw/pull/1617))

-

#### tldraw.css ([#1607](https://github.com/tldraw/tldraw/pull/1607))

- [tldraw] Removes `editor.css` and `ui.css` exports, replaces with `tldraw.css`

#### Styles API ([#1580](https://github.com/tldraw/tldraw/pull/1580))

-

#### (1/2) Cursor Chat - Presence ([#1487](https://github.com/tldraw/tldraw/pull/1487))

- [dev] Added support for cursor chat presence.

#### Use unpkg as a default for serving assets. ([#1548](https://github.com/tldraw/tldraw/pull/1548))

- Use unpkg asset hosting as a default.

#### hoist opacity out of props ([#1526](https://github.com/tldraw/tldraw/pull/1526))

[internal only for now]

#### Select locked shapes on long press ([#1529](https://github.com/tldraw/tldraw/pull/1529))



#### highlighter fixes ([#1530](https://github.com/tldraw/tldraw/pull/1530))

[aq bug fixes]

#### Simplify static cursors ([#1520](https://github.com/tldraw/tldraw/pull/1520))

- (editor) Simplifies the cursors in our CSS.

#### Renaming types, shape utils, tools ([#1513](https://github.com/tldraw/tldraw/pull/1513))

- Renaming of types, shape utils, tools

#### tlschema cleanup ([#1509](https://github.com/tldraw/tldraw/pull/1509))

- [editor] Remove `app.createShapeId`
- [tlschema] Cleans up exports

#### Cleanup @tldraw/ui types / exports ([#1504](https://github.com/tldraw/tldraw/pull/1504))

- [editor] clean up / unify types

#### rename app to editor ([#1503](https://github.com/tldraw/tldraw/pull/1503))

- Rename `App` to `Editor` and many other things that reference `app` to `editor`.

#### Add support for locking shapes ([#1447](https://github.com/tldraw/tldraw/pull/1447))

- Add support for locking shapes.

#### [3/3] Highlighter styling ([#1490](https://github.com/tldraw/tldraw/pull/1490))

Highlighter pen is here! 🎉🎉🎉

#### [1/3] initial highlighter shape/tool ([#1401](https://github.com/tldraw/tldraw/pull/1401))

[internal only change layout ground work for highlighter]

#### [feature] reduce motion ([#1485](https://github.com/tldraw/tldraw/pull/1485))

- [editor] Add `reduceMotion` user preference
- Add reduce motion option to preferences

#### Feature flags rework ([#1474](https://github.com/tldraw/tldraw/pull/1474))

[internal only change]

#### [refactor] update record names ([#1473](https://github.com/tldraw/tldraw/pull/1473))

- [editor] rename record types

#### remove safari special-casing for paste ([#1470](https://github.com/tldraw/tldraw/pull/1470))

[fixes a regression introduced during this release]

#### Don't allow `g` keyboard shortcut in readonly mode, show laser tool in the toolbar ([#1459](https://github.com/tldraw/tldraw/pull/1459))

- Disable geo tool shortcut in readonly mode. Show laser on the toolbar.

#### [mini-feature] Following indicator ([#1468](https://github.com/tldraw/tldraw/pull/1468))

- Adds viewport following indicator

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### Add translations for "Leave shared project" action ([#1394](https://github.com/tldraw/tldraw/pull/1394))

- None

#### Stricter ID types ([#1439](https://github.com/tldraw/tldraw/pull/1439))

[internal only, covered by #1432 changelog]

#### Add SVG cursors for all cursor types ([#1416](https://github.com/tldraw/tldraw/pull/1416))

- Added consistent custom cursors.

#### [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. ([#1432](https://github.com/tldraw/tldraw/pull/1432))

- [tlschema] Update props of `createTLSchema`
- [editor] Update props of `TldrawEditorConfig`
- [editor] Remove `App.getShapeUtilByType`
- [editor] Update `App.getShapeUtil` to take a type rather than a shape

#### Measure individual words instead of just line breaks for text exports ([#1397](https://github.com/tldraw/tldraw/pull/1397))

- Add a brief release note for your PR here.

#### [feature] Add checkbox to toolbar ([#1423](https://github.com/tldraw/tldraw/pull/1423))

- Adds missing checkbox to toolbar.

#### [feature] add laser pointer ([#1412](https://github.com/tldraw/tldraw/pull/1412))

- Adds the laser pointer tool.

#### Vertical text alignment for geo shapes ([#1414](https://github.com/tldraw/tldraw/pull/1414))

- This adds vertical text alignment property to geo shapes.

#### [fix] page menu, drag handle css ([#1406](https://github.com/tldraw/tldraw/pull/1406))

- Fix styling in the page menu

#### Switch to new collaborators component ([#1405](https://github.com/tldraw/tldraw/pull/1405))

- [Breaking] Removes the old version of LiveCollaborators, replacing it with the new one based on `TLInstancePresence`

#### [improvement] refactor paste to support multi-line text ([#1398](https://github.com/tldraw/tldraw/pull/1398))

- Improves clipboard logic when pasting text
- Adds support for pasting multi-line text
- Adds maximum widths when pasting single-line text
- Adds support for RTL languages when pasting multi-line or wrapped text
- Strips leading indentation when pasting text

#### Don't allow the users to use keyboard shortcuts to select tools in readonly mode. ([#1382](https://github.com/tldraw/tldraw/pull/1382))

- Disable keyboard shortcut events for tools in readonly mode. We only allow the select, hand tools, and zoom tool.

#### [fix] Don't synchronize isReadOnly ([#1396](https://github.com/tldraw/tldraw/pull/1396))

- Removes the isReadOnly value from the `user_document_settings` record type.

#### Add localizations for snapshots links ([#1347](https://github.com/tldraw/tldraw/pull/1347))

- Add localization for creating snapshot links.

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

#### Export Events stuff ([#1360](https://github.com/tldraw/tldraw/pull/1360))

- [ui] export the `TLUiEventSource` type
- [ui] export the `EventsProviderProps ` type
- [ui] export the `useEvents ` hook

#### [improvement] rename onEvent to onUiEvent ([#1358](https://github.com/tldraw/tldraw/pull/1358))

- [docs] Adds docs for ui events
- [tldraw] Renames `onEvent` to `onUiEvent`

#### [improvement] Ui events followup ([#1354](https://github.com/tldraw/tldraw/pull/1354))

- [ui] Adds source to ui events data object
- [ui] Corrects source for toolbar events
- [ui] Corrects source for clipboard events
- [examples] Updates events example

#### Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled ([#1342](https://github.com/tldraw/tldraw/pull/1342))

- Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled

---

#### 💥 Breaking Change

- [fix] react component runaways, error boundaries [#1625](https://github.com/tldraw/tldraw/pull/1625) ([@steveruizok](https://github.com/steveruizok))
- tldraw.css [#1607](https://github.com/tldraw/tldraw/pull/1607) ([@steveruizok](https://github.com/steveruizok))
- Tidy up [#1600](https://github.com/tldraw/tldraw/pull/1600) ([@steveruizok](https://github.com/steveruizok))
- Styles API [#1580](https://github.com/tldraw/tldraw/pull/1580) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Use unpkg as a default for serving assets. [#1548](https://github.com/tldraw/tldraw/pull/1548) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- hoist opacity out of props [#1526](https://github.com/tldraw/tldraw/pull/1526) ([@SomeHats](https://github.com/SomeHats))
- Independent instance state persistence [#1493](https://github.com/tldraw/tldraw/pull/1493) ([@ds300](https://github.com/ds300))
- Renaming types, shape utils, tools [#1513](https://github.com/tldraw/tldraw/pull/1513) ([@steveruizok](https://github.com/steveruizok))
- tlschema cleanup [#1509](https://github.com/tldraw/tldraw/pull/1509) ([@steveruizok](https://github.com/steveruizok))
- Cleanup @tldraw/ui types / exports [#1504](https://github.com/tldraw/tldraw/pull/1504) ([@steveruizok](https://github.com/steveruizok))
- rename app to editor [#1503](https://github.com/tldraw/tldraw/pull/1503) ([@steveruizok](https://github.com/steveruizok))
- Add support for project names [#1340](https://github.com/tldraw/tldraw/pull/1340) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
- [refactor] update record names [#1473](https://github.com/tldraw/tldraw/pull/1473) ([@steveruizok](https://github.com/steveruizok))
- [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. [#1432](https://github.com/tldraw/tldraw/pull/1432) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- Switch to new collaborators component [#1405](https://github.com/tldraw/tldraw/pull/1405) ([@ds300](https://github.com/ds300))
- [fix] Don't synchronize isReadOnly [#1396](https://github.com/tldraw/tldraw/pull/1396) ([@ds300](https://github.com/ds300))
- [improvement] rename onEvent to onUiEvent [#1358](https://github.com/tldraw/tldraw/pull/1358) ([@steveruizok](https://github.com/steveruizok))
- [improvement] Ui events followup [#1354](https://github.com/tldraw/tldraw/pull/1354) ([@steveruizok](https://github.com/steveruizok))
- [feature] ui events [#1326](https://github.com/tldraw/tldraw/pull/1326) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- Styles API follow-ups [#1636](https://github.com/tldraw/tldraw/pull/1636) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- (1/2) Cursor Chat - Presence [#1487](https://github.com/tldraw/tldraw/pull/1487) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Add support for locking shapes [#1447](https://github.com/tldraw/tldraw/pull/1447) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [3/3] Highlighter styling [#1490](https://github.com/tldraw/tldraw/pull/1490) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [1/3] initial highlighter shape/tool [#1401](https://github.com/tldraw/tldraw/pull/1401) ([@SomeHats](https://github.com/SomeHats))
- [feature] reduce motion [#1485](https://github.com/tldraw/tldraw/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- [mini-feature] Following indicator [#1468](https://github.com/tldraw/tldraw/pull/1468) ([@steveruizok](https://github.com/steveruizok))
- Add SVG cursors for all cursor types [#1416](https://github.com/tldraw/tldraw/pull/1416) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [feature] Add checkbox to toolbar [#1423](https://github.com/tldraw/tldraw/pull/1423) ([@steveruizok](https://github.com/steveruizok))
- [feature] add laser pointer [#1412](https://github.com/tldraw/tldraw/pull/1412) ([@steveruizok](https://github.com/steveruizok))
- Vertical text alignment for geo shapes [#1414](https://github.com/tldraw/tldraw/pull/1414) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [improvement] refactor paste to support multi-line text [#1398](https://github.com/tldraw/tldraw/pull/1398) ([@steveruizok](https://github.com/steveruizok))
- Add stuff for new 'share project' flow [#1403](https://github.com/tldraw/tldraw/pull/1403) ([@ds300](https://github.com/ds300))
- open menus refactor [#1400](https://github.com/tldraw/tldraw/pull/1400) ([@steveruizok](https://github.com/steveruizok))
- Snapshot link menu translations [#1399](https://github.com/tldraw/tldraw/pull/1399) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- 3/2 Cursor chat [#1623](https://github.com/tldraw/tldraw/pull/1623) ([@steveruizok](https://github.com/steveruizok))
- [fix] embeds [#1578](https://github.com/tldraw/tldraw/pull/1578) ([@steveruizok](https://github.com/steveruizok))
- Asset improvements [#1557](https://github.com/tldraw/tldraw/pull/1557) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Use `"Toggle locked"` [#1538](https://github.com/tldraw/tldraw/pull/1538) ([@steveruizok](https://github.com/steveruizok))
- Select locked shapes on long press [#1529](https://github.com/tldraw/tldraw/pull/1529) ([@steveruizok](https://github.com/steveruizok))
- highlighter fixes [#1530](https://github.com/tldraw/tldraw/pull/1530) ([@SomeHats](https://github.com/SomeHats))
- Feature flags rework [#1474](https://github.com/tldraw/tldraw/pull/1474) ([@SomeHats](https://github.com/SomeHats))
- remove safari special-casing for paste [#1470](https://github.com/tldraw/tldraw/pull/1470) ([@SomeHats](https://github.com/SomeHats))
- Don't allow `g` keyboard shortcut in readonly mode, show laser tool in the toolbar [#1459](https://github.com/tldraw/tldraw/pull/1459) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Fix people menu button border on android [#1471](https://github.com/tldraw/tldraw/pull/1471) ([@TodePond](https://github.com/TodePond))
- [fix] lock option for laser tool [#1460](https://github.com/tldraw/tldraw/pull/1460) ([@steveruizok](https://github.com/steveruizok))
- Add laser keyboard shortcut. [#1467](https://github.com/tldraw/tldraw/pull/1467) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] make follow icon visible on iPad [#1462](https://github.com/tldraw/tldraw/pull/1462) ([@steveruizok](https://github.com/steveruizok))
- [fix] page item submenu [#1461](https://github.com/tldraw/tldraw/pull/1461) ([@steveruizok](https://github.com/steveruizok))
- Add translations for "Leave shared project" action [#1394](https://github.com/tldraw/tldraw/pull/1394) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Stricter ID types [#1439](https://github.com/tldraw/tldraw/pull/1439) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Measure individual words instead of just line breaks for text exports [#1397](https://github.com/tldraw/tldraw/pull/1397) ([@SomeHats](https://github.com/SomeHats))
- [fix] page menu, drag handle css [#1406](https://github.com/tldraw/tldraw/pull/1406) ([@steveruizok](https://github.com/steveruizok))
- Don't allow the users to use keyboard shortcuts to select tools in readonly mode. [#1382](https://github.com/tldraw/tldraw/pull/1382) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Disabling middle click paste in favour of panning [#1335](https://github.com/tldraw/tldraw/pull/1335) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- Export Events stuff [#1360](https://github.com/tldraw/tldraw/pull/1360) ([@steveruizok](https://github.com/steveruizok))
- Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled [#1342](https://github.com/tldraw/tldraw/pull/1342) ([@orangemug](https://github.com/orangemug))
- [feature] `check-box` geo shape [#1330](https://github.com/tldraw/tldraw/pull/1330) ([@steveruizok](https://github.com/steveruizok))
- [tiny] rename show menu paste [#1332](https://github.com/tldraw/tldraw/pull/1332) ([@steveruizok](https://github.com/steveruizok))
- remove svg layer, html all the things, rs to tl [#1227](https://github.com/tldraw/tldraw/pull/1227) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- New vite-based examples app [#1226](https://github.com/tldraw/tldraw/pull/1226) ([@SomeHats](https://github.com/SomeHats))
- readmes [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@steveruizok](https://github.com/steveruizok))
- update @radix-ui/react-popover to 1.0.6-rc.5 [#1206](https://github.com/tldraw/tldraw/pull/1206) ([@SomeHats](https://github.com/SomeHats))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- [fix] pick a better default language [#1201](https://github.com/tldraw/tldraw/pull/1201) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- Added `pHYs` to import/export of png images [#1200](https://github.com/tldraw/tldraw/pull/1200) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Explicit shape type checks [#1594](https://github.com/tldraw/tldraw/pull/1594) ([@steveruizok](https://github.com/steveruizok))
- move some kbds into actions and tools [#1585](https://github.com/tldraw/tldraw/pull/1585) ([@BrianHung](https://github.com/BrianHung) [@steveruizok](https://github.com/steveruizok))
- [improvement] bookmark shape logic [#1568](https://github.com/tldraw/tldraw/pull/1568) ([@steveruizok](https://github.com/steveruizok))
- Simplify static cursors [#1520](https://github.com/tldraw/tldraw/pull/1520) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- Add localizations for snapshots links [#1347](https://github.com/tldraw/tldraw/pull/1347) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### 🧪 Tests

- Add playwright tests [#1484](https://github.com/tldraw/tldraw/pull/1484) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Incorporate signia as @tldraw/state [#1620](https://github.com/tldraw/tldraw/pull/1620) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Revert "Update dependencies (#1613)" [#1617](https://github.com/tldraw/tldraw/pull/1617) ([@SomeHats](https://github.com/SomeHats))
- Update dependencies [#1613](https://github.com/tldraw/tldraw/pull/1613) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 7

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- add vietnamese to language menu, and strings that were missing from lokalise [#1578](https://github.com/tldraw/tldraw-lite/pull/1578) ([@TodePond](https://github.com/TodePond))
- Fix for dialogs rendering outside of portal [#1576](https://github.com/tldraw/tldraw-lite/pull/1576) ([@orangemug](https://github.com/orangemug))
- [fix] item height when in mobile [#1573](https://github.com/tldraw/tldraw-lite/pull/1573) ([@steveruizok](https://github.com/steveruizok))
- [fix] menus, add dialog debug thing [#1570](https://github.com/tldraw/tldraw-lite/pull/1570) ([@steveruizok](https://github.com/steveruizok))
- [fix] use masked page bounds for finding drop parent [#1564](https://github.com/tldraw/tldraw-lite/pull/1564) ([@steveruizok](https://github.com/steveruizok))
- Fix the location of pasted excalidraw content. [#1554](https://github.com/tldraw/tldraw-lite/pull/1554) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- add community translations [#1559](https://github.com/tldraw/tldraw-lite/pull/1559) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- Fix safari clipboard issues [#1535](https://github.com/tldraw/tldraw-lite/pull/1535) ([@orangemug](https://github.com/orangemug))
- Add proper messaging & import flows for migration from local & multiplayer rooms [#1506](https://github.com/tldraw/tldraw-lite/pull/1506) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- fix spacing of double dropdown picker [#1545](https://github.com/tldraw/tldraw-lite/pull/1545) ([@TodePond](https://github.com/TodePond))
- [feature] `App.canMoveCamera` [#1543](https://github.com/tldraw/tldraw-lite/pull/1543) ([@steveruizok](https://github.com/steveruizok))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- Add vscode notification when opening v1 files [#1469](https://github.com/tldraw/tldraw-lite/pull/1469) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Rename some methods [#1528](https://github.com/tldraw/tldraw-lite/pull/1528) ([@steveruizok](https://github.com/steveruizok))
- [fix] better titles for double dropdown picker [#1524](https://github.com/tldraw/tldraw-lite/pull/1524) ([@steveruizok](https://github.com/steveruizok))
- Remove react-intl [#1521](https://github.com/tldraw/tldraw-lite/pull/1521) ([@steveruizok](https://github.com/steveruizok))
- Don't use previous opacity for new `bookmark`/`embed` shapes [#1510](https://github.com/tldraw/tldraw-lite/pull/1510) ([@orangemug](https://github.com/orangemug))
- Fix back to content button. [#1519](https://github.com/tldraw/tldraw-lite/pull/1519) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Define `isMobilePointer` in `<PagesMenu/>` [#1511](https://github.com/tldraw/tldraw-lite/pull/1511) ([@orangemug](https://github.com/orangemug))
- remove max width on menu items to fit longer translations (eg: German) [#1508](https://github.com/tldraw/tldraw-lite/pull/1508) ([@TodePond](https://github.com/TodePond))
- Update existing translations based on v1 [#1515](https://github.com/tldraw/tldraw-lite/pull/1515) ([@TodePond](https://github.com/TodePond))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- Asset loading overhaul [#1457](https://github.com/tldraw/tldraw-lite/pull/1457) ([@SomeHats](https://github.com/SomeHats))
- [feature] paste from Excalidraw [#1417](https://github.com/tldraw/tldraw-lite/pull/1417) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
- [improvement] docs / api cleanup [#1491](https://github.com/tldraw/tldraw-lite/pull/1491) ([@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#1492](https://github.com/tldraw/tldraw-lite/pull/1492) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- update cloudflare deps [#1493](https://github.com/tldraw/tldraw-lite/pull/1493) ([@threepointone](https://github.com/threepointone))
- Add a toast message when trying to open files from shared documents. [#1490](https://github.com/tldraw/tldraw-lite/pull/1490) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add a new page during the move-to-page operation [#1460](https://github.com/tldraw/tldraw-lite/pull/1460) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- Fix an issue with adding html elements to the document body. [#1481](https://github.com/tldraw/tldraw-lite/pull/1481) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- derive currentToolId from app.root [#1459](https://github.com/tldraw/tldraw-lite/pull/1459) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [fix] remove unused icons, untrack assets [#1464](https://github.com/tldraw/tldraw-lite/pull/1464) ([@steveruizok](https://github.com/steveruizok))
- Always file->print with light-mode enabled [#1315](https://github.com/tldraw/tldraw-lite/pull/1315) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [fix] scrolling to focused menu item [#1456](https://github.com/tldraw/tldraw-lite/pull/1456) ([@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- Added `preserveAspectRatio` to print for overflow of content [#1453](https://github.com/tldraw/tldraw-lite/pull/1453) ([@orangemug](https://github.com/orangemug))
- [fix] Menu paste button [#1451](https://github.com/tldraw/tldraw-lite/pull/1451) ([@steveruizok](https://github.com/steveruizok))
- Fix flashing when adding a new page [#1429](https://github.com/tldraw/tldraw-lite/pull/1429) ([@orangemug](https://github.com/orangemug))
- Fix language menu not 'checking' the chosen language [#1445](https://github.com/tldraw/tldraw-lite/pull/1445) ([@TodePond](https://github.com/TodePond))
- [fix] dev version number for tldraw/tldraw [#1434](https://github.com/tldraw/tldraw-lite/pull/1434) ([@steveruizok](https://github.com/steveruizok))
- [fix] translations, refresh assets [#1436](https://github.com/tldraw/tldraw-lite/pull/1436) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- Fix out of order logic. [#1425](https://github.com/tldraw/tldraw-lite/pull/1425) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Vscode extension [#1253](https://github.com/tldraw/tldraw-lite/pull/1253) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@orangemug](https://github.com/orangemug))
- Bring over v1 translations [#1422](https://github.com/tldraw/tldraw-lite/pull/1422) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Disable context menu when right clicking context menu [#1414](https://github.com/tldraw/tldraw-lite/pull/1414) ([@orangemug](https://github.com/orangemug))
- [chore] Create main.json [#1410](https://github.com/tldraw/tldraw-lite/pull/1410) ([@steveruizok](https://github.com/steveruizok))
- [ui] update checkboxes for language menu [#1412](https://github.com/tldraw/tldraw-lite/pull/1412) ([@steveruizok](https://github.com/steveruizok))
- Revert "Remove print element and print style after printing." [#1411](https://github.com/tldraw/tldraw-lite/pull/1411) ([@orangemug](https://github.com/orangemug))

#### ⚠️ Pushed to `main`

- main: update api-report.md ([@SomeHats](https://github.com/SomeHats))

#### Authors: 7

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu[ke] Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Sunil Pai ([@threepointone](https://github.com/threepointone))

---

# @tldraw/ui

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.11
  - @tldraw/primitives@2.0.0-alpha.11
  - @tldraw/tlsync-client@2.0.0-alpha.11
  - @tldraw/utils@2.0.0-alpha.10

## 2.0.0-alpha.10

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues
- Updated dependencies [4b4399b6e]
  - @tldraw/primitives@2.0.0-alpha.10
  - @tldraw/tlsync-client@2.0.0-alpha.10
  - @tldraw/utils@2.0.0-alpha.9
  - @tldraw/editor@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.9
  - @tldraw/primitives@2.0.0-alpha.9
  - @tldraw/tlsync-client@2.0.0-alpha.9
  - @tldraw/utils@2.0.0-alpha.8

## 2.0.0-alpha.8

### Patch Changes

- 23dd81cfe: Make signia a peer dependency
- Updated dependencies [23dd81cfe]
  - @tldraw/editor@2.0.0-alpha.8
  - @tldraw/tlsync-client@2.0.0-alpha.8
  - @tldraw/primitives@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.7
  - @tldraw/primitives@2.0.0-alpha.7
  - @tldraw/tlsync-client@2.0.0-alpha.7
  - @tldraw/utils@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.6
  - @tldraw/primitives@2.0.0-alpha.6
  - @tldraw/tlsync-client@2.0.0-alpha.6
  - @tldraw/utils@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.5
  - @tldraw/primitives@2.0.0-alpha.5
  - @tldraw/tlsync-client@2.0.0-alpha.5
  - @tldraw/utils@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.4
  - @tldraw/primitives@2.0.0-alpha.4
  - @tldraw/tlsync-client@2.0.0-alpha.4
  - @tldraw/utils@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.3
  - @tldraw/primitives@2.0.0-alpha.3
  - @tldraw/tlsync-client@2.0.0-alpha.3
  - @tldraw/utils@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.2
  - @tldraw/primitives@2.0.0-alpha.2
  - @tldraw/tlsync-client@2.0.0-alpha.2
  - @tldraw/utils@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.11
  - @tldraw/tldraw-beta@0.1.0-alpha.11
  - @tldraw/tlsync-client@0.1.0-alpha.11
  - @tldraw/utils@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.10
  - @tldraw/tldraw-beta@0.1.0-alpha.10
  - @tldraw/tlsync-client@0.1.0-alpha.10
  - @tldraw/utils@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.9
  - @tldraw/tldraw-beta@0.1.0-alpha.9
  - @tldraw/tlsync-client@0.1.0-alpha.9
  - @tldraw/utils@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.8
  - @tldraw/tldraw-beta@0.1.0-alpha.8
  - @tldraw/tlsync-client@0.1.0-alpha.8
  - @tldraw/utils@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.7
  - @tldraw/tldraw-beta@0.1.0-alpha.7
  - @tldraw/tlsync-client@0.1.0-alpha.7
  - @tldraw/utils@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/primitives@0.0.2-alpha.1
  - @tldraw/tldraw-beta@0.0.2-alpha.1
  - @tldraw/tlsync-client@0.0.2-alpha.1
  - @tldraw/utils@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/primitives@0.0.2-alpha.0
  - @tldraw/tldraw-beta@0.0.2-alpha.0
  - @tldraw/tlsync-client@0.0.2-alpha.0
  - @tldraw/utils@0.0.2-alpha.0

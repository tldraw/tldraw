# v2.0.0-alpha.16 (Wed Oct 11 2023)

### Release Notes

#### [fix] Hit testing against zero width / height lines ([#2060](https://github.com/tldraw/tldraw/pull/2060))

- [fix] Bug where arrows would not bind to straight lines

#### Fix opacity lowering on shapes that cannot be deleted ([#2061](https://github.com/tldraw/tldraw/pull/2061))

- Locked shapes don't change opacity when scribble erasing.

Before/after:

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/763a93eb-ffaa-405c-9255-e68ba88ed9a2" />

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/dc9d3f77-c1c5-40f2-a9fe-10c723b6a21c" />

#### fix: proper label for opacity tooltip on hover ([#2044](https://github.com/tldraw/tldraw/pull/2044))

- Add a brief release note for your PR here.

#### Fix alt + shift keyboard shortcuts ([#2053](https://github.com/tldraw/tldraw/pull/2053))

- Fixes keyboard shortcuts that use `alt` and `shift` modifiers.

#### [improvement] Scope `getShapeAtPoint` to rendering shapes only ([#2043](https://github.com/tldraw/tldraw/pull/2043))

- Improve perf for hovering shapes / shape hit tests

#### Remove topBar prop from <TldrawUi /> ([#2018](https://github.com/tldraw/tldraw/pull/2018))

- [BREAKING] removed topBar prop

---

#### 🚀 Enhancement

- [improvement] Scope `getShapeAtPoint` to rendering shapes only [#2043](https://github.com/tldraw/tldraw/pull/2043) ([@steveruizok](https://github.com/steveruizok))
- Remove dot com ui styles [1/2] [#2039](https://github.com/tldraw/tldraw/pull/2039) ([@steveruizok](https://github.com/steveruizok))
- Remove topBar prop from <TldrawUi /> [#2018](https://github.com/tldraw/tldraw/pull/2018) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- [fix] Hit testing against zero width / height lines [#2060](https://github.com/tldraw/tldraw/pull/2060) ([@steveruizok](https://github.com/steveruizok))
- Fix opacity lowering on shapes that cannot be deleted [#2061](https://github.com/tldraw/tldraw/pull/2061) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- fix: proper label for opacity tooltip on hover [#2044](https://github.com/tldraw/tldraw/pull/2044) ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
- Fix newlines in text geo shapes [#2059](https://github.com/tldraw/tldraw/pull/2059) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok))
- Fix alt + shift keyboard shortcuts [#2053](https://github.com/tldraw/tldraw/pull/2053) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Restore background [#2037](https://github.com/tldraw/tldraw/pull/2037) ([@steveruizok](https://github.com/steveruizok))
- [fix] Stylepanel default spacing [#2036](https://github.com/tldraw/tldraw/pull/2036) ([@steveruizok](https://github.com/steveruizok))
- Export tools [#2035](https://github.com/tldraw/tldraw/pull/2035) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prince Mendiratta ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### frame label fix ([#2016](https://github.com/tldraw/tldraw/pull/2016))

- Add a brief release note for your PR here.

#### fix cloud rendering ([#2008](https://github.com/tldraw/tldraw/pull/2008))

- Improves cloud shape rendering

#### [improvement] prevent editing in readonly ([#1990](https://github.com/tldraw/tldraw/pull/1990))

- Prevent editing text shapes in readonly mode.

#### Fix style panel opening when disabled ([#1983](https://github.com/tldraw/tldraw/pull/1983))

- When select tool is active, the style menu shouldn't be openable unless a shape is also selected.

Before/After

<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/91ea55c8-0fcc-4f73-b61e-565829a5f25e" />
<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/ee4070fe-e236-4818-8fb4-43520210102b" />

#### Fix text-wrapping on Safari ([#1980](https://github.com/tldraw/tldraw/pull/1980))

- Fix text wrapping differently on Safari and Chrome/Firefox

Before/After

<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/320171b4-61e0-4a41-b8d3-830bd90bea65">
<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/b42d7156-0ce9-4894-9692-9338dc931b79">

#### Remove focus management ([#1953](https://github.com/tldraw/tldraw/pull/1953))

- [editor] Make autofocus default, remove automatic blur / focus events.

#### [fix] Drawing tool touch for first pen mark ([#1977](https://github.com/tldraw/tldraw/pull/1977))

- [fix] Accidental palm inputs when using iPad pencil

#### Remove targeted editing from text ([#1962](https://github.com/tldraw/tldraw/pull/1962))

- Fixed some cases where text would get selected in the wrong place.
- Changed the behaviour of text selection. Removed 'deep editing'.

#### fix line bugs ([#1936](https://github.com/tldraw/tldraw/pull/1936))

- This PR patches a couple of bugs which led to straight draw lines and beziered dash lines not rendering on the canvas

Before & After:

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/e0ca7d54-506f-4014-b65a-6b61a98e3665" />
<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/90c9fa12-1bcb-430d-80c7-97e1faacea16" />

#### Allow right clicking selection backgrounds ([#1968](https://github.com/tldraw/tldraw/pull/1968))

- Improved right click behaviour.

#### Mark an undo before toggling lock ([#1969](https://github.com/tldraw/tldraw/pull/1969))

- Mark an undo before toggling locked.

#### Stop editing frame headers when clicking inside a frame. ([#1955](https://github.com/tldraw/tldraw/pull/1955))

- Stop editing frame headers when clicking inside of a frame.

#### [feature] Include `sources` in `TLExternalContent` ([#1925](https://github.com/tldraw/tldraw/pull/1925))

- [editor / tldraw] add `sources` to `TLExternalContent`

#### [improvement] quick actions ([#1922](https://github.com/tldraw/tldraw/pull/1922))

- Improve the menu / kbds behavior when select tool is not active

#### Firefox: Fix dropdowns not opening with touch ([#1923](https://github.com/tldraw/tldraw/pull/1923))

- Firefox: Fixed dropdown menus not opening with touch.

#### Fix lines being draggable via their background ([#1920](https://github.com/tldraw/tldraw/pull/1920))

- None - unreleased bug

#### Fix first handle of line snapping to itself ([#1912](https://github.com/tldraw/tldraw/pull/1912))

- Fixed a bug where the first handle of a line shape could snap to itself.

#### [fix] Moving group items inside of a frame (dropping) ([#1886](https://github.com/tldraw/tldraw/pull/1886))

- Fix bug: ungroup when moving a shape in a group in a frame.

#### [fix] id properties of undefined (#1730) ([#1919](https://github.com/tldraw/tldraw/pull/1919))

- Fixed a bug similar #1730

#### :recycle: fix: editing is not terminated after the conversion is confirmed. ([#1885](https://github.com/tldraw/tldraw/pull/1885))

-  fix: editing is not terminated after the conversion is confirmed.

#### Fix selecting one shape from selection group ([#1905](https://github.com/tldraw/tldraw/pull/1905))

- Fix bug when selecting a single shape from a selection group

Before

https://github.com/tldraw/tldraw/assets/98838967/1412f9c6-d466-42b3-af94-d08cbc1656be

After
![Kapture 2023-09-18 at 14 15 10](https://github.com/tldraw/tldraw/assets/98838967/70a7336d-7905-4b4c-b684-d5d62f2383b3)

#### Fix highlighter dots not being clickable ([#1903](https://github.com/tldraw/tldraw/pull/1903))

- None - unreleased bug

#### Fix video shape controls ([#1909](https://github.com/tldraw/tldraw/pull/1909))

- Fixes pointer events for editing video shapes.

#### Fix line handles ([#1904](https://github.com/tldraw/tldraw/pull/1904))

- Fixes an issue where line handles were slightly offset from the indicator line.

#### Fix pinch start with toolbar open ([#1895](https://github.com/tldraw/tldraw/pull/1895))

- Fixes a bug that could trigger undo by accident when closing the style toolbar via a pinch gesture on mobile.

#### Migrate snapshot ([#1843](https://github.com/tldraw/tldraw/pull/1843))

- [editor] add `Store.migrateSnapshot`

#### [fix] zero width / height bounds ([#1840](https://github.com/tldraw/tldraw/pull/1840))

- Fix bug with straight lines / arrows

#### clamp x-box and check-box lines to stay within box at small scales ([#1860](https://github.com/tldraw/tldraw/pull/1860))

- Fixes a regression introduced by the geometry refactor related to x-box and checkbox resizing.

#### Fix paste transform ([#1859](https://github.com/tldraw/tldraw/pull/1859))

- Fixes a bug affecting the position of pasted content inside frames.

#### [feature] Asset props ([#1824](https://github.com/tldraw/tldraw/pull/1824))

- [@tldraw/tldraw] add asset props

#### [fix] editing video shapes ([#1821](https://github.com/tldraw/tldraw/pull/1821))

- Fix bug with editing video shapes.

#### [feature] unlock all action ([#1820](https://github.com/tldraw/tldraw/pull/1820))

- Adds the unlock all feature.

#### Fix text editing in page menu popover ([#1790](https://github.com/tldraw/tldraw/pull/1790))

- (fix) page menu editing

#### [fix] embeds switching / tldraw embed ([#1792](https://github.com/tldraw/tldraw/pull/1792))

- [fix] tldraw embeds

#### Custom rendering margin / don't cull selected shapes ([#1788](https://github.com/tldraw/tldraw/pull/1788))

- [editor] add `Editor.renderingBoundsMargin`

#### Camera APIs ([#1786](https://github.com/tldraw/tldraw/pull/1786))

- (editor) improve camera commands

#### environment manager ([#1784](https://github.com/tldraw/tldraw/pull/1784))

- [editor] Move environment flags to environment manager

#### Editor commands API / effects ([#1778](https://github.com/tldraw/tldraw/pull/1778))

- tbd

#### export `UiEventsProvider` ([#1774](https://github.com/tldraw/tldraw/pull/1774))

- [@tldraw/tldraw] export ui events, so that UI hooks can work without context

#### remove useForceSolid effect for geo / line shapes ([#1769](https://github.com/tldraw/tldraw/pull/1769))

- Remove the force solid switching for geo / line shapes

#### remove `selectionPageCenter` ([#1766](https://github.com/tldraw/tldraw/pull/1766))

- [dev] Removes `Editor.selectionPageCenter`

#### rename selection page bounds ([#1763](https://github.com/tldraw/tldraw/pull/1763))

- [editor] rename `selectedPageBounds` to `selectionPageBounds`

#### `ShapeUtil.getGeometry`, selection rewrite ([#1751](https://github.com/tldraw/tldraw/pull/1751))

- [editor] Remove `ShapeUtil.getBounds`, `ShapeUtil.getOutline`, `ShapeUtil.hitTestPoint`, `ShapeUtil.hitTestLineSegment`
- [editor] Add `ShapeUtil.getGeometry`
- [editor] Add `Editor.getShapeGeometry`

#### Fix asset urls ([#1758](https://github.com/tldraw/tldraw/pull/1758))

- Fixed asset urls

#### [fix] arrow snapping bug ([#1756](https://github.com/tldraw/tldraw/pull/1756))

- [fix] arrow snapping

#### [fix] dark mode ([#1754](https://github.com/tldraw/tldraw/pull/1754))

- [fix] dark mode colors not updating

#### Remove helpers / extraneous API methods. ([#1745](https://github.com/tldraw/tldraw/pull/1745))

- [tldraw] rename `useReadonly` to `useReadOnly`
- [editor] remove `Editor.isDarkMode`
- [editor] remove `Editor.isChangingStyle`
- [editor] remove `Editor.isCoarsePointer`
- [editor] remove `Editor.isDarkMode`
- [editor] remove `Editor.isFocused`
- [editor] remove `Editor.isGridMode`
- [editor] remove `Editor.isPenMode`
- [editor] remove `Editor.isReadOnly`
- [editor] remove `Editor.isSnapMode`
- [editor] remove `Editor.isToolLocked`
- [editor] remove `Editor.locale`
- [editor] rename `Editor.pageState` to `Editor.currentPageState`
- [editor] add `Editor.pageStates`
- [editor] add `Editor.setErasingIds`
- [editor] add `Editor.setEditingId`
- [editor] add several new component overrides

#### fix: escape eraser tool on escape ([#1732](https://github.com/tldraw/tldraw/pull/1732))

- escape eraser tool on escape

#### fix: arrow label dark mode color ([#1733](https://github.com/tldraw/tldraw/pull/1733))

- fixed arrow label dark mode color

#### tldraw zero - package shuffle ([#1710](https://github.com/tldraw/tldraw/pull/1710))

- [@tldraw/editor] lots, wip
- [@tldraw/ui] gone, merged to tldraw/tldraw
- [@tldraw/polyfills] gone, merged to tldraw/editor
- [@tldraw/primitives] gone, merged to tldraw/editor / tldraw/tldraw
- [@tldraw/indices] gone, merged to tldraw/editor
- [@tldraw/file-format] gone, merged to tldraw/tldraw

---

#### 💥 Breaking Change

- [improvement] prevent editing in readonly [#1990](https://github.com/tldraw/tldraw/pull/1990) ([@steveruizok](https://github.com/steveruizok))
- Remove focus management [#1953](https://github.com/tldraw/tldraw/pull/1953) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Remove targeted editing from text [#1962](https://github.com/tldraw/tldraw/pull/1962) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Make user preferences optional [#1963](https://github.com/tldraw/tldraw/pull/1963) ([@ds300](https://github.com/ds300))
- [improvement] quick actions [#1922](https://github.com/tldraw/tldraw/pull/1922) ([@steveruizok](https://github.com/steveruizok))
- [fix] style changes [#1814](https://github.com/tldraw/tldraw/pull/1814) ([@steveruizok](https://github.com/steveruizok))
- Cleanup page state commands [#1800](https://github.com/tldraw/tldraw/pull/1800) ([@steveruizok](https://github.com/steveruizok))
- Rendering / cropping side-effects [#1799](https://github.com/tldraw/tldraw/pull/1799) ([@steveruizok](https://github.com/steveruizok))
- history options / markId / createPage [#1796](https://github.com/tldraw/tldraw/pull/1796) ([@steveruizok](https://github.com/steveruizok))
- Update setter names, `setXXShapeId` rather than `setXXId` [#1789](https://github.com/tldraw/tldraw/pull/1789) ([@steveruizok](https://github.com/steveruizok))
- Rename shapes apis [#1787](https://github.com/tldraw/tldraw/pull/1787) ([@steveruizok](https://github.com/steveruizok))
- Camera APIs [#1786](https://github.com/tldraw/tldraw/pull/1786) ([@steveruizok](https://github.com/steveruizok))
- environment manager [#1784](https://github.com/tldraw/tldraw/pull/1784) ([@steveruizok](https://github.com/steveruizok))
- Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
- Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- remove `selectionPageCenter` [#1766](https://github.com/tldraw/tldraw/pull/1766) ([@steveruizok](https://github.com/steveruizok))
- rename selection page bounds [#1763](https://github.com/tldraw/tldraw/pull/1763) ([@steveruizok](https://github.com/steveruizok))
- `ShapeUtil.getGeometry`, selection rewrite [#1751](https://github.com/tldraw/tldraw/pull/1751) ([@steveruizok](https://github.com/steveruizok))
- More cleanup, focus bug fixes [#1749](https://github.com/tldraw/tldraw/pull/1749) ([@steveruizok](https://github.com/steveruizok))
- move some utils into tldraw/utils [#1750](https://github.com/tldraw/tldraw/pull/1750) ([@steveruizok](https://github.com/steveruizok))
- Remove helpers / extraneous API methods. [#1745](https://github.com/tldraw/tldraw/pull/1745) ([@steveruizok](https://github.com/steveruizok))
- tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Debugging cleanup / misc cleanup [#2025](https://github.com/tldraw/tldraw/pull/2025) ([@steveruizok](https://github.com/steveruizok))
- [feature] Include `sources` in `TLExternalContent` [#1925](https://github.com/tldraw/tldraw/pull/1925) ([@steveruizok](https://github.com/steveruizok))
- Fix arrow handle snapping, snapping to text labels, selection of text labels [#1910](https://github.com/tldraw/tldraw/pull/1910) ([@steveruizok](https://github.com/steveruizok))
- Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))
- Add snapshot prop, examples [#1856](https://github.com/tldraw/tldraw/pull/1856) ([@steveruizok](https://github.com/steveruizok))
- export asset stuff [#1829](https://github.com/tldraw/tldraw/pull/1829) ([@steveruizok](https://github.com/steveruizok))
- [feature] Asset props [#1824](https://github.com/tldraw/tldraw/pull/1824) ([@steveruizok](https://github.com/steveruizok))
- [feature] unlock all action [#1820](https://github.com/tldraw/tldraw/pull/1820) ([@steveruizok](https://github.com/steveruizok))
- [improvement] More selection logic [#1806](https://github.com/tldraw/tldraw/pull/1806) ([@steveruizok](https://github.com/steveruizok))
- Add shapes to exports [#1776](https://github.com/tldraw/tldraw/pull/1776) ([@steveruizok](https://github.com/steveruizok))
- export `UiEventsProvider` [#1774](https://github.com/tldraw/tldraw/pull/1774) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrow snapping bug [#1756](https://github.com/tldraw/tldraw/pull/1756) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Update readme [#2027](https://github.com/tldraw/tldraw/pull/2027) ([@steveruizok](https://github.com/steveruizok))
- frame label fix [#2016](https://github.com/tldraw/tldraw/pull/2016) ([@ds300](https://github.com/ds300))
- [fix] Focus events (actually) [#2015](https://github.com/tldraw/tldraw/pull/2015) ([@steveruizok](https://github.com/steveruizok))
- [fix] Minimap interactions [#2012](https://github.com/tldraw/tldraw/pull/2012) ([@steveruizok](https://github.com/steveruizok))
- Contain all the things [#1999](https://github.com/tldraw/tldraw/pull/1999) ([@steveruizok](https://github.com/steveruizok))
- [fix] Image size [#2002](https://github.com/tldraw/tldraw/pull/2002) ([@steveruizok](https://github.com/steveruizok))
- fix text in geo shapes not causing its container to grow [#2003](https://github.com/tldraw/tldraw/pull/2003) ([@SomeHats](https://github.com/SomeHats))
- [fix] tool lock button in toolbar [#2009](https://github.com/tldraw/tldraw/pull/2009) ([@steveruizok](https://github.com/steveruizok))
- Fix an issue with arrow creation. [#2004](https://github.com/tldraw/tldraw/pull/2004) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- fix cloud rendering [#2008](https://github.com/tldraw/tldraw/pull/2008) ([@ds300](https://github.com/ds300))
- Fix hooks error. [#2000](https://github.com/tldraw/tldraw/pull/2000) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix style panel opening when disabled [#1983](https://github.com/tldraw/tldraw/pull/1983) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Fix text-wrapping on Safari [#1980](https://github.com/tldraw/tldraw/pull/1980) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- [fix] text shape outline [#1974](https://github.com/tldraw/tldraw/pull/1974) ([@steveruizok](https://github.com/steveruizok))
- [fix] Drawing tool touch for first pen mark [#1977](https://github.com/tldraw/tldraw/pull/1977) ([@steveruizok](https://github.com/steveruizok))
- [fix] Screen bounds offset after editing text [#1976](https://github.com/tldraw/tldraw/pull/1976) ([@steveruizok](https://github.com/steveruizok))
- fix line bugs [#1936](https://github.com/tldraw/tldraw/pull/1936) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Allow right clicking selection backgrounds [#1968](https://github.com/tldraw/tldraw/pull/1968) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Mark an undo before toggling lock [#1969](https://github.com/tldraw/tldraw/pull/1969) ([@steveruizok](https://github.com/steveruizok))
- Stop editing frame headers when clicking inside a frame. [#1955](https://github.com/tldraw/tldraw/pull/1955) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
- [fix] geo shape text label placement [#1927](https://github.com/tldraw/tldraw/pull/1927) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- expanded highlighter geometry [#1929](https://github.com/tldraw/tldraw/pull/1929) ([@SomeHats](https://github.com/SomeHats))
- Firefox: Fix dropdowns not opening with touch [#1923](https://github.com/tldraw/tldraw/pull/1923) ([@TodePond](https://github.com/TodePond))
- Fix lines being draggable via their background [#1920](https://github.com/tldraw/tldraw/pull/1920) ([@TodePond](https://github.com/TodePond))
- Fix first handle of line snapping to itself [#1912](https://github.com/tldraw/tldraw/pull/1912) ([@TodePond](https://github.com/TodePond))
- [fix] Moving group items inside of a frame (dropping) [#1886](https://github.com/tldraw/tldraw/pull/1886) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
- [fix] id properties of undefined (#1730) [#1919](https://github.com/tldraw/tldraw/pull/1919) ([@momenthana](https://github.com/momenthana))
- :recycle: fix: editing is not terminated after the conversion is confirmed. [#1885](https://github.com/tldraw/tldraw/pull/1885) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
- Fix selecting one shape from selection group [#1905](https://github.com/tldraw/tldraw/pull/1905) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- [fix] help menu css [#1888](https://github.com/tldraw/tldraw/pull/1888) ([@steveruizok](https://github.com/steveruizok))
- Fix highlighter dots not being clickable [#1903](https://github.com/tldraw/tldraw/pull/1903) ([@TodePond](https://github.com/TodePond))
- Fix video shape controls [#1909](https://github.com/tldraw/tldraw/pull/1909) ([@ds300](https://github.com/ds300))
- Fix line handles [#1904](https://github.com/tldraw/tldraw/pull/1904) ([@ds300](https://github.com/ds300))
- Fix pinch start with toolbar open [#1895](https://github.com/tldraw/tldraw/pull/1895) ([@ds300](https://github.com/ds300))
- [fix] iframe losing focus on pointer down [#1848](https://github.com/tldraw/tldraw/pull/1848) ([@steveruizok](https://github.com/steveruizok))
- [fix] zero width / height bounds [#1840](https://github.com/tldraw/tldraw/pull/1840) ([@steveruizok](https://github.com/steveruizok))
- clamp x-box and check-box lines to stay within box at small scales [#1860](https://github.com/tldraw/tldraw/pull/1860) ([@ds300](https://github.com/ds300))
- avoid pixel rounding / transformation miscalc for overlay items [#1858](https://github.com/tldraw/tldraw/pull/1858) ([@BrianHung](https://github.com/BrianHung) [@ds300](https://github.com/ds300))
- Fix paste transform [#1859](https://github.com/tldraw/tldraw/pull/1859) ([@ds300](https://github.com/ds300))
- [fix] exit penmode [#1847](https://github.com/tldraw/tldraw/pull/1847) ([@steveruizok](https://github.com/steveruizok))
- [fix] assets and content handlers [#1846](https://github.com/tldraw/tldraw/pull/1846) ([@steveruizok](https://github.com/steveruizok))
- [fix] line tool bug with tool locked [#1841](https://github.com/tldraw/tldraw/pull/1841) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrows bind to locked shapes [#1833](https://github.com/tldraw/tldraw/pull/1833) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] text editing outline when scaled [#1826](https://github.com/tldraw/tldraw/pull/1826) ([@steveruizok](https://github.com/steveruizok))
- [fix] Line shape rendering [#1825](https://github.com/tldraw/tldraw/pull/1825) ([@steveruizok](https://github.com/steveruizok))
- [fix] remove CSS radius calculations [#1823](https://github.com/tldraw/tldraw/pull/1823) ([@steveruizok](https://github.com/steveruizok))
- [fix] editing video shapes [#1821](https://github.com/tldraw/tldraw/pull/1821) ([@steveruizok](https://github.com/steveruizok))
- [fix] Sticky text content / hovered shapes [#1808](https://github.com/tldraw/tldraw/pull/1808) ([@steveruizok](https://github.com/steveruizok))
- [fix] Collaborator scribble on tldraw [#1804](https://github.com/tldraw/tldraw/pull/1804) ([@steveruizok](https://github.com/steveruizok))
- [fix] page to screen [#1797](https://github.com/tldraw/tldraw/pull/1797) ([@steveruizok](https://github.com/steveruizok))
- [fix] Don't make arrows shapes to arrows [#1793](https://github.com/tldraw/tldraw/pull/1793) ([@steveruizok](https://github.com/steveruizok))
- Fix text editing in page menu popover [#1790](https://github.com/tldraw/tldraw/pull/1790) ([@steveruizok](https://github.com/steveruizok))
- [fix] embeds switching / tldraw embed [#1792](https://github.com/tldraw/tldraw/pull/1792) ([@steveruizok](https://github.com/steveruizok))
- Custom rendering margin / don't cull selected shapes [#1788](https://github.com/tldraw/tldraw/pull/1788) ([@steveruizok](https://github.com/steveruizok))
- Fix outlines on text shapes [#1781](https://github.com/tldraw/tldraw/pull/1781) ([@steveruizok](https://github.com/steveruizok))
- remove useForceSolid effect for geo / line shapes [#1769](https://github.com/tldraw/tldraw/pull/1769) ([@steveruizok](https://github.com/steveruizok))
- [fix] minimap, common page bounds [#1770](https://github.com/tldraw/tldraw/pull/1770) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrow rendering safari [#1767](https://github.com/tldraw/tldraw/pull/1767) ([@steveruizok](https://github.com/steveruizok))
- [fix] restore bg option, fix calculations [#1765](https://github.com/tldraw/tldraw/pull/1765) ([@steveruizok](https://github.com/steveruizok))
- [fix] revert legacy changes to buildFromV1Document.ts [#1761](https://github.com/tldraw/tldraw/pull/1761) ([@steveruizok](https://github.com/steveruizok))
- Fix asset urls [#1758](https://github.com/tldraw/tldraw/pull/1758) ([@lakesare](https://github.com/lakesare))
- [fix] dark mode [#1754](https://github.com/tldraw/tldraw/pull/1754) ([@steveruizok](https://github.com/steveruizok))
- [fix]: Fix typo in shapeType declaration [#1747](https://github.com/tldraw/tldraw/pull/1747) ([@ricardo-crespo](https://github.com/ricardo-crespo) [@steveruizok](https://github.com/steveruizok))
- fix: escape eraser tool on escape [#1732](https://github.com/tldraw/tldraw/pull/1732) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))
- fix: arrow label dark mode color [#1733](https://github.com/tldraw/tldraw/pull/1733) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- [fix] CSS reload in dev [#1791](https://github.com/tldraw/tldraw/pull/1791) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- [fix] Right click groups [#1975](https://github.com/tldraw/tldraw/pull/1975) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))

#### Authors: 12

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Evgenia Karunus ([@lakesare](https://github.com/lakesare))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Hana ([@momenthana](https://github.com/momenthana))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Ricardo Crespo ([@ricardo-crespo](https://github.com/ricardo-crespo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Takuto Mori Gump ([@mr04vv](https://github.com/mr04vv))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### `ShapeUtil` refactor, `Editor` cleanup ([#1611](https://github.com/tldraw/tldraw/pull/1611))

- [editor] renames `defaultProps` to `getDefaultProps`
- [editor] removes `outline`, `outlineSegments`, `handles`, `bounds`
- [editor] renames `renderBackground` to `backgroundComponent`

#### Revert "Update dependencies (#1613)" ([#1617](https://github.com/tldraw/tldraw/pull/1617))

-

#### tldraw.css ([#1607](https://github.com/tldraw/tldraw/pull/1607))

- [tldraw] Removes `editor.css` and `ui.css` exports, replaces with `tldraw.css`

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### rename app to editor ([#1503](https://github.com/tldraw/tldraw/pull/1503))

- Rename `App` to `Editor` and many other things that reference `app` to `editor`.

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### [refactor] restore createTLSchema ([#1444](https://github.com/tldraw/tldraw/pull/1444))

- [editor] Simplifies custom shape definition
- [tldraw] Updates props for <TldrawEditor> component to require a `TldrawEditorConfig`.

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

---

#### 💥 Breaking Change

- `ShapeUtil` refactor, `Editor` cleanup [#1611](https://github.com/tldraw/tldraw/pull/1611) ([@steveruizok](https://github.com/steveruizok))
- tldraw.css [#1607](https://github.com/tldraw/tldraw/pull/1607) ([@steveruizok](https://github.com/steveruizok))
- mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- rename app to editor [#1503](https://github.com/tldraw/tldraw/pull/1503) ([@steveruizok](https://github.com/steveruizok))
- [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
- [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- [refactor] restore createTLSchema [#1444](https://github.com/tldraw/tldraw/pull/1444) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- [fix] tldraw api report [#1615](https://github.com/tldraw/tldraw/pull/1615) ([@steveruizok](https://github.com/steveruizok))
- New vite-based examples app [#1226](https://github.com/tldraw/tldraw/pull/1226) ([@SomeHats](https://github.com/SomeHats))
- readmes [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@steveruizok](https://github.com/steveruizok))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))
- Fix to not ignore the `userId` option for `<Tldraw/>` component in `@tldraw/tldraw` [#1205](https://github.com/tldraw/tldraw/pull/1205) ([@orangemug](https://github.com/orangemug))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### 🔩 Dependency Updates

- Revert "Update dependencies (#1613)" [#1617](https://github.com/tldraw/tldraw/pull/1617) ([@SomeHats](https://github.com/SomeHats))
- Update dependencies [#1613](https://github.com/tldraw/tldraw/pull/1613) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- [fix] Tldraw component props [#1552](https://github.com/tldraw/tldraw-lite/pull/1552) ([@ds300](https://github.com/ds300))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/ui

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.11
  - @tldraw/polyfills@2.0.0-alpha.10
  - @tldraw/tlsync-client@2.0.0-alpha.11
  - @tldraw/ui@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues
- Updated dependencies [4b4399b6e]
  - @tldraw/polyfills@2.0.0-alpha.9
  - @tldraw/tlsync-client@2.0.0-alpha.10
  - @tldraw/ui@2.0.0-alpha.10
  - @tldraw/editor@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.9
  - @tldraw/polyfills@2.0.0-alpha.8
  - @tldraw/tlsync-client@2.0.0-alpha.9
  - @tldraw/ui@2.0.0-alpha.9

## 2.0.0-alpha.8

### Patch Changes

- Updated dependencies [23dd81cfe]
  - @tldraw/editor@2.0.0-alpha.8
  - @tldraw/tlsync-client@2.0.0-alpha.8
  - @tldraw/ui@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.7
  - @tldraw/tlsync-client@2.0.0-alpha.7
  - @tldraw/ui@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.6
  - @tldraw/tlsync-client@2.0.0-alpha.6
  - @tldraw/ui@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.5
  - @tldraw/tlsync-client@2.0.0-alpha.5
  - @tldraw/ui@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.4
  - @tldraw/tlsync-client@2.0.0-alpha.4
  - @tldraw/ui@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.3
  - @tldraw/tlsync-client@2.0.0-alpha.3
  - @tldraw/ui@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.2
  - @tldraw/tlsync-client@2.0.0-alpha.2
  - @tldraw/ui@2.0.0-alpha.2

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

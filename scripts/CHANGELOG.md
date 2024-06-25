# v2.2.4 (Tue Jun 25 2024)

### Release Notes

#### editing: don't allow editing locked shapes when edit→edit mode. ([#4007](https://github.com/tldraw/tldraw/pull/4007))

- Editing: don't allow editing locked shapes when edit→edit mode.

#### clipboard: fix copy/paste bad typo, ugh ([#4008](https://github.com/tldraw/tldraw/pull/4008))

- Clipboard: fix copy/paste for older versions of Firefox

#### clipboard: fix copy/paste on Firefox ([#4003](https://github.com/tldraw/tldraw/pull/4003))

- Clipboard: fix copy/paste in Firefox 127+

#### Fix multiple editor instances issue ([#4001](https://github.com/tldraw/tldraw/pull/4001))

- Fix a bug causing text shape measurement to work incorrectly when using react strict mode

#### fix: typo on "CardShapeUtil" example name ([#3998](https://github.com/tldraw/tldraw/pull/3998))

- Fix typo on "CardShapeUtil" name in the custom shape example documentation.

#### Update license in readme of the store package ([#3990](https://github.com/tldraw/tldraw/pull/3990))

- Fix the license in the readme file for the store package.

#### Add a new environment for publishing ([#3981](https://github.com/tldraw/tldraw/pull/3981))

- Introduce a new CI environment and use it for publishing vs code extension.

#### Fix vs code publishing ([#3976](https://github.com/tldraw/tldraw/pull/3976))

- Fix VS Code publishing.

#### Fix border color for following user ([#3975](https://github.com/tldraw/tldraw/pull/3975))

- Add a brief release note for your PR here.

#### Fix edge scrolling at odd browser zoom levels ([#3973](https://github.com/tldraw/tldraw/pull/3973))

- Add a brief release note for your PR here.

#### images: make isAnimated check on shared rooms work better ([#3967](https://github.com/tldraw/tldraw/pull/3967))

- Images: fix isAnimated checks when adding an image to a shared room.

#### Add fill fill style. ([#3966](https://github.com/tldraw/tldraw/pull/3966))

- Secretly adds a fill-fill style (Alt-F)

#### Add tags to examples frontmatter ([#3929](https://github.com/tldraw/tldraw/pull/3929))

- Improve filtering of examples

#### Fix solid style draw shape. ([#3963](https://github.com/tldraw/tldraw/pull/3963))

- Fixes the appearance of solid-style heart shapes.

#### Fix asset positions ([#3965](https://github.com/tldraw/tldraw/pull/3965))

- Fixes the position of multiple assets when pasted / dropped onto the canvas.

#### Fix draw shape indicators for pen-drawn solid shapes ([#3962](https://github.com/tldraw/tldraw/pull/3962))

- Fixes a bug with the indicator for stylus-drawn draw shapes.

#### assets: fix copy/paste with missing src ([#3959](https://github.com/tldraw/tldraw/pull/3959))

- Assets: fix copy/paste for new asset resolver mechanic.

#### [Experiment] Allow users to use system's appearance (dark / light) mode ([#3703](https://github.com/tldraw/tldraw/pull/3703))

- Add a brief release note for your PR here.

#### Improve edge scrolling ([#3950](https://github.com/tldraw/tldraw/pull/3950))

- Add a delay and easing to edge scrolling.

#### Set up automatic VS Code publishing ([#3905](https://github.com/tldraw/tldraw/pull/3905))

- Automate publishing of the VS Code extension.

#### Move from unpkg to our own cdn. ([#3923](https://github.com/tldraw/tldraw/pull/3923))

- Start using our own cdn instead of unpkg.

#### bookmark: css tweaks ([#3955](https://github.com/tldraw/tldraw/pull/3955))

- Bookmarks: padding tweaks

#### Dynamic size mode + fill fill ([#3835](https://github.com/tldraw/tldraw/pull/3835))

- Adds a dynamic size user preferences.
- Removes double click to reset scale on text shapes.
- Removes double click to reset autosize on text shapes.

#### assets: preload fonts ([#3927](https://github.com/tldraw/tldraw/pull/3927))

- Perf: improve font loading timing on dotcom.

#### [tiny] getSnapshot and loadSnapshot on Editor class ([#3912](https://github.com/tldraw/tldraw/pull/3912))

- Add a brief release note for your PR here.

#### Make ArrowBindingUtil public ([#3913](https://github.com/tldraw/tldraw/pull/3913))

- Add a brief release note for your PR here.

#### Flatten shapes to image(s) ([#3933](https://github.com/tldraw/tldraw/pull/3933))

- Add Flatten, a new menu item to flatten shapes into images

#### Update with api key with access to all buckets ([#3944](https://github.com/tldraw/tldraw/pull/3944))

- Retrigger canary packaging.

#### Retrying with Mime's keys ([#3943](https://github.com/tldraw/tldraw/pull/3943))

- Retrigger canary package build to publish a new package and upload assets to R2.

#### Empty PR to trigger canary publish ([#3942](https://github.com/tldraw/tldraw/pull/3942))

- Retrigger canary package build to publish a new package and upload assets to R2.

#### Fix uploading static assets to r2 ([#3941](https://github.com/tldraw/tldraw/pull/3941))

- Fix an issue with uploading the static assets.

#### Uploading the static assets to R2 bucket ([#3921](https://github.com/tldraw/tldraw/pull/3921))

- Upload our static assets (fonts, icons, embed-icons, translations) to a R2 bucket so that we can move away from using unpkg and start using our own cdn.

#### assets: store in indexedDB, not as base64 ([#3836](https://github.com/tldraw/tldraw/pull/3836))

- Assets: store as reference to blob in indexedDB instead of storing directly as base64 in the snapshot.

#### images: avoid double request for animated images ([#3924](https://github.com/tldraw/tldraw/pull/3924))

- Images: avoid double request for animated images.

#### Fix document name editable in readonly mode ([#3911](https://github.com/tldraw/tldraw/pull/3911))

- Remove ability to rename document while in readonly mode

#### assets: make option to transform urls dynamically / LOD ([#3827](https://github.com/tldraw/tldraw/pull/3827))

- Assets: make option to transform urls dynamically to provide different sized images on demand.

#### VS Code release 2.0.36 ([#3922](https://github.com/tldraw/tldraw/pull/3922))

- VS Code 2.0.36 release.

---

:heart: 🐛 Bug Fixes :heart:
- editing: don't allow editing locked shapes when edit→edit mode. [#4007](https://github.com/tldraw/tldraw/pull/4007) ([@mimecuvalo](https://github.com/mimecuvalo))
- clipboard: fix copy/paste bad typo, ugh [#4008](https://github.com/tldraw/tldraw/pull/4008) ([@mimecuvalo](https://github.com/mimecuvalo))
- clipboard: fix copy/paste on Firefox [#4003](https://github.com/tldraw/tldraw/pull/4003) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix multiple editor instances issue [#4001](https://github.com/tldraw/tldraw/pull/4001) ([@SomeHats](https://github.com/SomeHats))
- fix: typo on "CardShapeUtil" example name [#3998](https://github.com/tldraw/tldraw/pull/3998) ([@bholmesdev](https://github.com/bholmesdev))
- Fix border color for following user [#3975](https://github.com/tldraw/tldraw/pull/3975) ([@ds300](https://github.com/ds300))
- Fix scale issue with new draw lines [#3971](https://github.com/tldraw/tldraw/pull/3971) ([@steveruizok](https://github.com/steveruizok))
- Fix edge scrolling at odd browser zoom levels [#3973](https://github.com/tldraw/tldraw/pull/3973) ([@ds300](https://github.com/ds300))
- flattening: use correct id for asset [#3968](https://github.com/tldraw/tldraw/pull/3968) ([@mimecuvalo](https://github.com/mimecuvalo))
- images: make isAnimated check on shared rooms work better [#3967](https://github.com/tldraw/tldraw/pull/3967) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix solid style draw shape. [#3963](https://github.com/tldraw/tldraw/pull/3963) ([@steveruizok](https://github.com/steveruizok))
- Fix asset positions [#3965](https://github.com/tldraw/tldraw/pull/3965) ([@steveruizok](https://github.com/steveruizok))
- lod: fix up missing timeout from bad merge [#3964](https://github.com/tldraw/tldraw/pull/3964) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix draw shape indicators for pen-drawn solid shapes [#3962](https://github.com/tldraw/tldraw/pull/3962) ([@steveruizok](https://github.com/steveruizok))
- assets: fix copy/paste with missing src [#3959](https://github.com/tldraw/tldraw/pull/3959) ([@mimecuvalo](https://github.com/mimecuvalo))
- bookmark: css tweaks [#3955](https://github.com/tldraw/tldraw/pull/3955) ([@mimecuvalo](https://github.com/mimecuvalo))
- assets: fix up videos with indexedDB [#3954](https://github.com/tldraw/tldraw/pull/3954) ([@mimecuvalo](https://github.com/mimecuvalo))
- assets: add crossorigin tag for preloaded fonts [#3953](https://github.com/tldraw/tldraw/pull/3953) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update with api key with access to all buckets [#3944](https://github.com/tldraw/tldraw/pull/3944) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Retrying with Mime's keys [#3943](https://github.com/tldraw/tldraw/pull/3943) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Empty PR to trigger canary publish [#3942](https://github.com/tldraw/tldraw/pull/3942) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix uploading static assets to r2 [#3941](https://github.com/tldraw/tldraw/pull/3941) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- image: follow-up fixes for LOD [#3934](https://github.com/tldraw/tldraw/pull/3934) ([@mimecuvalo](https://github.com/mimecuvalo))
- images: avoid double request for animated images [#3924](https://github.com/tldraw/tldraw/pull/3924) ([@mimecuvalo](https://github.com/mimecuvalo))

:heart: 🚀 Features :heart:
- Add fill fill style. [#3966](https://github.com/tldraw/tldraw/pull/3966) ([@steveruizok](https://github.com/steveruizok))
- Dynamic size mode + fill fill [#3835](https://github.com/tldraw/tldraw/pull/3835) ([@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Make ArrowBindingUtil public [#3913](https://github.com/tldraw/tldraw/pull/3913) ([@ds300](https://github.com/ds300))
- Flatten shapes to image(s) [#3933](https://github.com/tldraw/tldraw/pull/3933) ([@steveruizok](https://github.com/steveruizok))
- assets: make option to transform urls dynamically / LOD [#3827](https://github.com/tldraw/tldraw/pull/3827) ([@mimecuvalo](https://github.com/mimecuvalo))

:heart: 💄 Improvements :heart:
- better auto-generated docs for Tldraw and TldrawEditor [#4012](https://github.com/tldraw/tldraw/pull/4012) ([@SomeHats](https://github.com/SomeHats))
- theme: rename color scheme to theme [#3991](https://github.com/tldraw/tldraw/pull/3991) ([@mimecuvalo](https://github.com/mimecuvalo))
- lod: dont transform SVGs [#3972](https://github.com/tldraw/tldraw/pull/3972) ([@mimecuvalo](https://github.com/mimecuvalo))
- lod: dont resize images that are culled [#3970](https://github.com/tldraw/tldraw/pull/3970) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add tags to examples frontmatter [#3929](https://github.com/tldraw/tldraw/pull/3929) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Document inherited members in reference [#3956](https://github.com/tldraw/tldraw/pull/3956) ([@SomeHats](https://github.com/SomeHats))
- [Experiment] Allow users to use system's appearance (dark / light) mode [#3703](https://github.com/tldraw/tldraw/pull/3703) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve edge scrolling [#3950](https://github.com/tldraw/tldraw/pull/3950) ([@steveruizok](https://github.com/steveruizok))
- Move from unpkg to our own cdn. [#3923](https://github.com/tldraw/tldraw/pull/3923) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- assets: preload fonts [#3927](https://github.com/tldraw/tldraw/pull/3927) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- [tiny] getSnapshot and loadSnapshot on Editor class [#3912](https://github.com/tldraw/tldraw/pull/3912) ([@ds300](https://github.com/ds300))
- assets: store in indexedDB, not as base64 [#3836](https://github.com/tldraw/tldraw/pull/3836) ([@mimecuvalo](https://github.com/mimecuvalo))
- Generated docs cleanup [#3935](https://github.com/tldraw/tldraw/pull/3935) ([@SomeHats](https://github.com/SomeHats))
- Inline documentation links in type excerpts [#3931](https://github.com/tldraw/tldraw/pull/3931) ([@SomeHats](https://github.com/SomeHats))
- Better generated docs for react components [#3930](https://github.com/tldraw/tldraw/pull/3930) ([@SomeHats](https://github.com/SomeHats))
- Fix document name editable in readonly mode [#3911](https://github.com/tldraw/tldraw/pull/3911) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- security: enforce use of our fetch function and its default referrerpolicy [#3884](https://github.com/tldraw/tldraw/pull/3884) ([@mimecuvalo](https://github.com/mimecuvalo))

:heart: 🧹 Chores :heart:
- assets: mark assetOptions as internal [#4014](https://github.com/tldraw/tldraw/pull/4014) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update license in readme of the store package [#3990](https://github.com/tldraw/tldraw/pull/3990) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code release 2.0.36 [#3922](https://github.com/tldraw/tldraw/pull/3922) ([@MitjaBezensek](https://github.com/MitjaBezensek))

:heart: 🛠️ Tools :heart:
- Fix vs code publishing [#3976](https://github.com/tldraw/tldraw/pull/3976) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Set up automatic VS Code publishing [#3905](https://github.com/tldraw/tldraw/pull/3905) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Uploading the static assets to R2 bucket [#3921](https://github.com/tldraw/tldraw/pull/3921) ([@MitjaBezensek](https://github.com/MitjaBezensek))

:heart: 🧪 Tests :heart:
- Add a new environment for publishing [#3981](https://github.com/tldraw/tldraw/pull/3981) ([@MitjaBezensek](https://github.com/MitjaBezensek))

:heart: 🔩 Dependency Updates :heart:
- build(deps): bump ws from 8.16.0 to 8.17.1 in the npm_and_yarn group across 1 directory [#3984](https://github.com/tldraw/tldraw/pull/3984) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 3 directories with 4 updates [#3920](https://github.com/tldraw/tldraw/pull/3920) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### Authors: 9

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Ben Holmes ([@bholmesdev](https://github.com/bholmesdev))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.2.4 (Tue Jun 25 2024)

### Release Notes

#### editing: don't allow editing locked shapes when edit→edit mode. ([#4007](https://github.com/tldraw/tldraw/pull/4007))

- Editing: don't allow editing locked shapes when edit→edit mode.

#### clipboard: fix copy/paste bad typo, ugh ([#4008](https://github.com/tldraw/tldraw/pull/4008))

- Clipboard: fix copy/paste for older versions of Firefox

#### clipboard: fix copy/paste on Firefox ([#4003](https://github.com/tldraw/tldraw/pull/4003))

- Clipboard: fix copy/paste in Firefox 127+

#### Fix multiple editor instances issue ([#4001](https://github.com/tldraw/tldraw/pull/4001))

- Fix a bug causing text shape measurement to work incorrectly when using react strict mode

#### fix: typo on "CardShapeUtil" example name ([#3998](https://github.com/tldraw/tldraw/pull/3998))

- Fix typo on "CardShapeUtil" name in the custom shape example documentation.

#### Update license in readme of the store package ([#3990](https://github.com/tldraw/tldraw/pull/3990))

- Fix the license in the readme file for the store package.

#### Add a new environment for publishing ([#3981](https://github.com/tldraw/tldraw/pull/3981))

- Introduce a new CI environment and use it for publishing vs code extension.

#### Fix vs code publishing ([#3976](https://github.com/tldraw/tldraw/pull/3976))

- Fix VS Code publishing.

#### Fix border color for following user ([#3975](https://github.com/tldraw/tldraw/pull/3975))

- Add a brief release note for your PR here.

#### Fix edge scrolling at odd browser zoom levels ([#3973](https://github.com/tldraw/tldraw/pull/3973))

- Add a brief release note for your PR here.

#### images: make isAnimated check on shared rooms work better ([#3967](https://github.com/tldraw/tldraw/pull/3967))

- Images: fix isAnimated checks when adding an image to a shared room.

#### Add fill fill style. ([#3966](https://github.com/tldraw/tldraw/pull/3966))

- Secretly adds a fill-fill style (Alt-F)

#### Add tags to examples frontmatter ([#3929](https://github.com/tldraw/tldraw/pull/3929))

- Improve filtering of examples

#### Fix solid style draw shape. ([#3963](https://github.com/tldraw/tldraw/pull/3963))

- Fixes the appearance of solid-style heart shapes.

#### Fix asset positions ([#3965](https://github.com/tldraw/tldraw/pull/3965))

- Fixes the position of multiple assets when pasted / dropped onto the canvas.

#### Fix draw shape indicators for pen-drawn solid shapes ([#3962](https://github.com/tldraw/tldraw/pull/3962))

- Fixes a bug with the indicator for stylus-drawn draw shapes.

#### assets: fix copy/paste with missing src ([#3959](https://github.com/tldraw/tldraw/pull/3959))

- Assets: fix copy/paste for new asset resolver mechanic.

#### [Experiment] Allow users to use system's appearance (dark / light) mode ([#3703](https://github.com/tldraw/tldraw/pull/3703))

- Add a brief release note for your PR here.

#### Improve edge scrolling ([#3950](https://github.com/tldraw/tldraw/pull/3950))

- Add a delay and easing to edge scrolling.

#### Set up automatic VS Code publishing ([#3905](https://github.com/tldraw/tldraw/pull/3905))

- Automate publishing of the VS Code extension.

#### Move from unpkg to our own cdn. ([#3923](https://github.com/tldraw/tldraw/pull/3923))

- Start using our own cdn instead of unpkg.

#### bookmark: css tweaks ([#3955](https://github.com/tldraw/tldraw/pull/3955))

- Bookmarks: padding tweaks

#### Dynamic size mode + fill fill ([#3835](https://github.com/tldraw/tldraw/pull/3835))

- Adds a dynamic size user preferences.
- Removes double click to reset scale on text shapes.
- Removes double click to reset autosize on text shapes.

#### assets: preload fonts ([#3927](https://github.com/tldraw/tldraw/pull/3927))

- Perf: improve font loading timing on dotcom.

#### [tiny] getSnapshot and loadSnapshot on Editor class ([#3912](https://github.com/tldraw/tldraw/pull/3912))

- Add a brief release note for your PR here.

#### Make ArrowBindingUtil public ([#3913](https://github.com/tldraw/tldraw/pull/3913))

- Add a brief release note for your PR here.

#### Flatten shapes to image(s) ([#3933](https://github.com/tldraw/tldraw/pull/3933))

- Add Flatten, a new menu item to flatten shapes into images

#### Update with api key with access to all buckets ([#3944](https://github.com/tldraw/tldraw/pull/3944))

- Retrigger canary packaging.

#### Retrying with Mime's keys ([#3943](https://github.com/tldraw/tldraw/pull/3943))

- Retrigger canary package build to publish a new package and upload assets to R2.

#### Empty PR to trigger canary publish ([#3942](https://github.com/tldraw/tldraw/pull/3942))

- Retrigger canary package build to publish a new package and upload assets to R2.

#### Fix uploading static assets to r2 ([#3941](https://github.com/tldraw/tldraw/pull/3941))

- Fix an issue with uploading the static assets.

#### Uploading the static assets to R2 bucket ([#3921](https://github.com/tldraw/tldraw/pull/3921))

- Upload our static assets (fonts, icons, embed-icons, translations) to a R2 bucket so that we can move away from using unpkg and start using our own cdn.

#### assets: store in indexedDB, not as base64 ([#3836](https://github.com/tldraw/tldraw/pull/3836))

- Assets: store as reference to blob in indexedDB instead of storing directly as base64 in the snapshot.

#### images: avoid double request for animated images ([#3924](https://github.com/tldraw/tldraw/pull/3924))

- Images: avoid double request for animated images.

#### Fix document name editable in readonly mode ([#3911](https://github.com/tldraw/tldraw/pull/3911))

- Remove ability to rename document while in readonly mode

#### assets: make option to transform urls dynamically / LOD ([#3827](https://github.com/tldraw/tldraw/pull/3827))

- Assets: make option to transform urls dynamically to provide different sized images on demand.

#### VS Code release 2.0.36 ([#3922](https://github.com/tldraw/tldraw/pull/3922))

- VS Code 2.0.36 release.

---

#### 🐛 Bug Fixes

- editing: don't allow editing locked shapes when edit→edit mode. [#4007](https://github.com/tldraw/tldraw/pull/4007) ([@mimecuvalo](https://github.com/mimecuvalo))
- clipboard: fix copy/paste bad typo, ugh [#4008](https://github.com/tldraw/tldraw/pull/4008) ([@mimecuvalo](https://github.com/mimecuvalo))
- clipboard: fix copy/paste on Firefox [#4003](https://github.com/tldraw/tldraw/pull/4003) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix multiple editor instances issue [#4001](https://github.com/tldraw/tldraw/pull/4001) ([@SomeHats](https://github.com/SomeHats))
- fix: typo on "CardShapeUtil" example name [#3998](https://github.com/tldraw/tldraw/pull/3998) ([@bholmesdev](https://github.com/bholmesdev))
- Fix border color for following user [#3975](https://github.com/tldraw/tldraw/pull/3975) ([@ds300](https://github.com/ds300))
- Fix scale issue with new draw lines [#3971](https://github.com/tldraw/tldraw/pull/3971) ([@steveruizok](https://github.com/steveruizok))
- Fix edge scrolling at odd browser zoom levels [#3973](https://github.com/tldraw/tldraw/pull/3973) ([@ds300](https://github.com/ds300))
- flattening: use correct id for asset [#3968](https://github.com/tldraw/tldraw/pull/3968) ([@mimecuvalo](https://github.com/mimecuvalo))
- images: make isAnimated check on shared rooms work better [#3967](https://github.com/tldraw/tldraw/pull/3967) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix solid style draw shape. [#3963](https://github.com/tldraw/tldraw/pull/3963) ([@steveruizok](https://github.com/steveruizok))
- Fix asset positions [#3965](https://github.com/tldraw/tldraw/pull/3965) ([@steveruizok](https://github.com/steveruizok))
- lod: fix up missing timeout from bad merge [#3964](https://github.com/tldraw/tldraw/pull/3964) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix draw shape indicators for pen-drawn solid shapes [#3962](https://github.com/tldraw/tldraw/pull/3962) ([@steveruizok](https://github.com/steveruizok))
- assets: fix copy/paste with missing src [#3959](https://github.com/tldraw/tldraw/pull/3959) ([@mimecuvalo](https://github.com/mimecuvalo))
- bookmark: css tweaks [#3955](https://github.com/tldraw/tldraw/pull/3955) ([@mimecuvalo](https://github.com/mimecuvalo))
- assets: fix up videos with indexedDB [#3954](https://github.com/tldraw/tldraw/pull/3954) ([@mimecuvalo](https://github.com/mimecuvalo))
- assets: add crossorigin tag for preloaded fonts [#3953](https://github.com/tldraw/tldraw/pull/3953) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update with api key with access to all buckets [#3944](https://github.com/tldraw/tldraw/pull/3944) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Retrying with Mime's keys [#3943](https://github.com/tldraw/tldraw/pull/3943) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Empty PR to trigger canary publish [#3942](https://github.com/tldraw/tldraw/pull/3942) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix uploading static assets to r2 [#3941](https://github.com/tldraw/tldraw/pull/3941) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- image: follow-up fixes for LOD [#3934](https://github.com/tldraw/tldraw/pull/3934) ([@mimecuvalo](https://github.com/mimecuvalo))
- images: avoid double request for animated images [#3924](https://github.com/tldraw/tldraw/pull/3924) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🚀 Features

- Add fill fill style. [#3966](https://github.com/tldraw/tldraw/pull/3966) ([@steveruizok](https://github.com/steveruizok))
- Dynamic size mode + fill fill [#3835](https://github.com/tldraw/tldraw/pull/3835) ([@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Make ArrowBindingUtil public [#3913](https://github.com/tldraw/tldraw/pull/3913) ([@ds300](https://github.com/ds300))
- Flatten shapes to image(s) [#3933](https://github.com/tldraw/tldraw/pull/3933) ([@steveruizok](https://github.com/steveruizok))
- assets: make option to transform urls dynamically / LOD [#3827](https://github.com/tldraw/tldraw/pull/3827) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 💄 Improvements

- better auto-generated docs for Tldraw and TldrawEditor [#4012](https://github.com/tldraw/tldraw/pull/4012) ([@SomeHats](https://github.com/SomeHats))
- theme: rename color scheme to theme [#3991](https://github.com/tldraw/tldraw/pull/3991) ([@mimecuvalo](https://github.com/mimecuvalo))
- lod: dont transform SVGs [#3972](https://github.com/tldraw/tldraw/pull/3972) ([@mimecuvalo](https://github.com/mimecuvalo))
- lod: dont resize images that are culled [#3970](https://github.com/tldraw/tldraw/pull/3970) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add tags to examples frontmatter [#3929](https://github.com/tldraw/tldraw/pull/3929) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Document inherited members in reference [#3956](https://github.com/tldraw/tldraw/pull/3956) ([@SomeHats](https://github.com/SomeHats))
- [Experiment] Allow users to use system's appearance (dark / light) mode [#3703](https://github.com/tldraw/tldraw/pull/3703) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve edge scrolling [#3950](https://github.com/tldraw/tldraw/pull/3950) ([@steveruizok](https://github.com/steveruizok))
- Move from unpkg to our own cdn. [#3923](https://github.com/tldraw/tldraw/pull/3923) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- assets: preload fonts [#3927](https://github.com/tldraw/tldraw/pull/3927) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- [tiny] getSnapshot and loadSnapshot on Editor class [#3912](https://github.com/tldraw/tldraw/pull/3912) ([@ds300](https://github.com/ds300))
- assets: store in indexedDB, not as base64 [#3836](https://github.com/tldraw/tldraw/pull/3836) ([@mimecuvalo](https://github.com/mimecuvalo))
- Generated docs cleanup [#3935](https://github.com/tldraw/tldraw/pull/3935) ([@SomeHats](https://github.com/SomeHats))
- Inline documentation links in type excerpts [#3931](https://github.com/tldraw/tldraw/pull/3931) ([@SomeHats](https://github.com/SomeHats))
- Better generated docs for react components [#3930](https://github.com/tldraw/tldraw/pull/3930) ([@SomeHats](https://github.com/SomeHats))
- Fix document name editable in readonly mode [#3911](https://github.com/tldraw/tldraw/pull/3911) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- security: enforce use of our fetch function and its default referrerpolicy [#3884](https://github.com/tldraw/tldraw/pull/3884) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🧹 Chores

- assets: mark assetOptions as internal [#4014](https://github.com/tldraw/tldraw/pull/4014) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update license in readme of the store package [#3990](https://github.com/tldraw/tldraw/pull/3990) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code release 2.0.36 [#3922](https://github.com/tldraw/tldraw/pull/3922) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ Tools

- Fix vs code publishing [#3976](https://github.com/tldraw/tldraw/pull/3976) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Set up automatic VS Code publishing [#3905](https://github.com/tldraw/tldraw/pull/3905) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Uploading the static assets to R2 bucket [#3921](https://github.com/tldraw/tldraw/pull/3921) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- Add a new environment for publishing [#3981](https://github.com/tldraw/tldraw/pull/3981) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🔩 Dependency Updates

- build(deps): bump ws from 8.16.0 to 8.17.1 in the npm_and_yarn group across 1 directory [#3984](https://github.com/tldraw/tldraw/pull/3984) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 3 directories with 4 updates [#3920](https://github.com/tldraw/tldraw/pull/3920) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### Authors: 9

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Ben Holmes ([@bholmesdev](https://github.com/bholmesdev))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# @tldraw/scripts

## 2.0.0-alpha.8

### Patch Changes

- Release day!

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor

## 0.1.0-alpha.10

### Patch Changes

- Fix stale reactors.

## 0.1.0-alpha.9

### Patch Changes

- Fix type export bug.

## 0.1.0-alpha.8

### Patch Changes

- Fix import bugs.

## 0.1.0-alpha.7

### Patch Changes

- Changes validation requirements, exports validation helpers.

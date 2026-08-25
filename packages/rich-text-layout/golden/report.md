# Golden drift report

Generated 2026-08-24T17:57:20.297Z

## Plain text

Cases: 1120

| group | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |
| ----- | ----- | ------ | ------ | ------ | ------ | --------------- |
| all   | 1120  | 202.82 | 19.41  | 59.00  | 0.00   | 27              |
| draw  | 280   | 93.16  | 0.13   | 59.00  | 0.00   | 6               |
| mono  | 280   | 202.82 | 41.34  | 59.00  | 0.00   | 10              |
| sans  | 280   | 93.16  | 0.16   | 59.00  | 0.00   | 4               |
| serif | 280   | 115.58 | 36.18  | 59.00  | 0.00   | 7               |

### Worst 10 cases

| case                   | chrome w×h (lines) | engine w×h (lines) | dw      | dh   |
| ---------------------- | ------------------ | ------------------ | ------- | ---- |
| arabic/mono/44/auto    | 792.11×59.00 (1)   | 589.29×59.00 (1)   | -202.82 | 0.00 |
| arabic/mono/36/auto    | 648.09×49.00 (1)   | 482.15×49.00 (1)   | -165.94 | 0.00 |
| hebrew/serif/44/auto   | 438.41×59.00 (1)   | 553.99×59.00 (1)   | 115.58  | 0.00 |
| arabic/mono/24/auto    | 432.06×32.00 (1)   | 321.43×32.00 (1)   | -110.63 | 0.00 |
| japanese/serif/44/auto | 704.00×59.00 (1)   | 608.96×59.00 (1)   | -95.04  | 0.00 |
| hebrew/serif/36/auto   | 358.70×49.00 (1)   | 453.24×49.00 (1)   | 94.54   | 0.00 |
| japanese/draw/44/auto  | 702.13×59.00 (1)   | 608.96×59.00 (1)   | -93.16  | 0.00 |
| japanese/sans/44/auto  | 702.13×59.00 (1)   | 608.96×59.00 (1)   | -93.16  | 0.00 |
| japanese/mono/44/auto  | 702.13×59.00 (1)   | 608.96×59.00 (1)   | -93.16  | 0.00 |
| korean/serif/44/auto   | 689.98×59.00 (1)   | 601.53×59.00 (1)   | -88.45  | 0.00 |

### Line-count mismatches (27)

- paragraph/draw/36/200: chrome 29, engine 30
- japanese/draw/36/200: chrome 4, engine 3
- japanese/sans/36/200: chrome 4, engine 3
- japanese/serif/36/200: chrome 4, engine 3
- japanese/mono/36/200: chrome 4, engine 3
- chinese/draw/24/200: chrome 3, engine 2
- chinese/draw/36/200: chrome 4, engine 3
- chinese/draw/44/200: chrome 5, engine 4
- chinese/sans/24/200: chrome 3, engine 2
- chinese/sans/36/200: chrome 4, engine 3
- chinese/sans/44/200: chrome 5, engine 4
- chinese/serif/24/200: chrome 3, engine 2
- chinese/serif/36/200: chrome 4, engine 3
- chinese/serif/44/200: chrome 5, engine 4
- chinese/mono/24/200: chrome 3, engine 2
- chinese/mono/36/200: chrome 4, engine 3
- chinese/mono/44/200: chrome 5, engine 4
- arabic/mono/24/200: chrome 3, engine 2
- arabic/mono/36/200: chrome 4, engine 3
- arabic/mono/44/200: chrome 5, engine 4
- hebrew/serif/18/200: chrome 1, engine 2
- hebrew/serif/36/200: chrome 2, engine 3
- hebrew/serif/44/200: chrome 3, engine 4
- hebrew/mono/44/200: chrome 5, engine 4
- longWords/draw/36/200: chrome 6, engine 7
- thai/mono/24/200: chrome 3, engine 2
- thai/mono/44/200: chrome 5, engine 4

## Plain text by case

Cases: 1120

| group           | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |
| --------------- | ----- | ------ | ------ | ------ | ------ | --------------- |
| all             | 1120  | 202.82 | 19.41  | 59.00  | 0.00   | 27              |
| arabic          | 32    | 202.82 | 165.94 | 59.00  | 49.00  | 3               |
| caps            | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| chinese         | 32    | 73.42  | 73.42  | 59.00  | 59.00  | 12              |
| combining       | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| emoji           | 32    | 12.04  | 12.01  | 0.00   | 0.00   | 0               |
| emptyLines      | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| german          | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| hebrew          | 32    | 115.58 | 94.54  | 59.00  | 59.00  | 4               |
| hyphenated      | 32    | 0.03   | 0.02   | 0.00   | 0.00   | 0               |
| japanese        | 32    | 95.04  | 93.16  | 49.00  | 49.00  | 4               |
| korean          | 32    | 88.45  | 72.38  | 0.00   | 0.00   | 0               |
| leadingSpaces   | 32    | 0.03   | 0.03   | 0.00   | 0.00   | 0               |
| longWord        | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| longWords       | 32    | 0.02   | 0.01   | 49.00  | 0.00   | 1               |
| manyWords       | 32    | 0.31   | 0.17   | 0.00   | 0.00   | 0               |
| mixedDirection  | 32    | 51.61  | 42.23  | 0.00   | 0.00   | 0               |
| multiLine       | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| nbsp            | 32    | 0.01   | 0.01   | 0.00   | 0.00   | 0               |
| numbers         | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| pangram         | 32    | 0.05   | 0.05   | 0.00   | 0.00   | 0               |
| paragraph       | 32    | 0.17   | 0.16   | 49.00  | 0.00   | 1               |
| punctuation     | 32    | 0.05   | 0.04   | 0.00   | 0.00   | 0               |
| repeatedSpaces  | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| short           | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| singleSpace     | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| tabLines        | 32    | 0.05   | 0.05   | 0.00   | 0.00   | 0               |
| tabs            | 32    | 0.09   | 0.09   | 0.00   | 0.00   | 0               |
| thai            | 32    | 62.21  | 50.91  | 59.00  | 32.00  | 2               |
| trailingNewline | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| trailingSpaces  | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| two             | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| unbreakable     | 32    | 0.02   | 0.01   | 0.00   | 0.00   | 0               |
| url             | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| vietnamese      | 32    | 0.04   | 0.03   | 0.00   | 0.00   | 0               |
| zeroWidth       | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |

### Worst 10 cases

| case                   | chrome w×h (lines) | engine w×h (lines) | dw      | dh   |
| ---------------------- | ------------------ | ------------------ | ------- | ---- |
| arabic/mono/44/auto    | 792.11×59.00 (1)   | 589.29×59.00 (1)   | -202.82 | 0.00 |
| arabic/mono/36/auto    | 648.09×49.00 (1)   | 482.15×49.00 (1)   | -165.94 | 0.00 |
| hebrew/serif/44/auto   | 438.41×59.00 (1)   | 553.99×59.00 (1)   | 115.58  | 0.00 |
| arabic/mono/24/auto    | 432.06×32.00 (1)   | 321.43×32.00 (1)   | -110.63 | 0.00 |
| japanese/serif/44/auto | 704.00×59.00 (1)   | 608.96×59.00 (1)   | -95.04  | 0.00 |
| hebrew/serif/36/auto   | 358.70×49.00 (1)   | 453.24×49.00 (1)   | 94.54   | 0.00 |
| japanese/draw/44/auto  | 702.13×59.00 (1)   | 608.96×59.00 (1)   | -93.16  | 0.00 |
| japanese/sans/44/auto  | 702.13×59.00 (1)   | 608.96×59.00 (1)   | -93.16  | 0.00 |
| japanese/mono/44/auto  | 702.13×59.00 (1)   | 608.96×59.00 (1)   | -93.16  | 0.00 |
| korean/serif/44/auto   | 689.98×59.00 (1)   | 601.53×59.00 (1)   | -88.45  | 0.00 |

### Line-count mismatches (27)

- paragraph/draw/36/200: chrome 29, engine 30
- japanese/draw/36/200: chrome 4, engine 3
- japanese/sans/36/200: chrome 4, engine 3
- japanese/serif/36/200: chrome 4, engine 3
- japanese/mono/36/200: chrome 4, engine 3
- chinese/draw/24/200: chrome 3, engine 2
- chinese/draw/36/200: chrome 4, engine 3
- chinese/draw/44/200: chrome 5, engine 4
- chinese/sans/24/200: chrome 3, engine 2
- chinese/sans/36/200: chrome 4, engine 3
- chinese/sans/44/200: chrome 5, engine 4
- chinese/serif/24/200: chrome 3, engine 2
- chinese/serif/36/200: chrome 4, engine 3
- chinese/serif/44/200: chrome 5, engine 4
- chinese/mono/24/200: chrome 3, engine 2
- chinese/mono/36/200: chrome 4, engine 3
- chinese/mono/44/200: chrome 5, engine 4
- arabic/mono/24/200: chrome 3, engine 2
- arabic/mono/36/200: chrome 4, engine 3
- arabic/mono/44/200: chrome 5, engine 4
- hebrew/serif/18/200: chrome 1, engine 2
- hebrew/serif/36/200: chrome 2, engine 3
- hebrew/serif/44/200: chrome 3, engine 4
- hebrew/mono/44/200: chrome 5, engine 4
- longWords/draw/36/200: chrome 6, engine 7
- thai/mono/24/200: chrome 3, engine 2
- thai/mono/44/200: chrome 5, engine 4

## Rich text

Cases: 296

| group | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |
| ----- | ----- | ------ | ------ | ------ | ------ | --------------- |
| all   | 296   | 47.90  | 0.56   | 1.60   | 0.19   | 0               |
| draw  | 148   | 47.90  | 0.65   | 1.60   | 0.40   | 0               |
| sans  | 148   | 47.90  | 0.06   | 0.19   | 0.04   | 0               |

### Worst 10 cases

| case                 | chrome w×h (lines) | engine w×h (lines) | dw     | dh   |
| -------------------- | ------------------ | ------------------ | ------ | ---- |
| cjkBold/sans/36/auto | 359.30×49.00 (1)   | 311.40×49.00 (1)   | -47.90 | 0.00 |
| cjkBold/draw/36/auto | 359.30×49.00 (1)   | 311.40×49.00 (1)   | -47.90 | 0.00 |
| cjkBold/sans/24/auto | 240.13×32.00 (1)   | 207.60×32.00 (1)   | -32.52 | 0.00 |
| cjkBold/draw/24/auto | 240.13×32.00 (1)   | 207.60×32.00 (1)   | -32.52 | 0.00 |
| rtlBold/draw/36/auto | 298.67×49.00 (1)   | 280.54×49.00 (1)   | -18.13 | 0.00 |
| rtlBold/sans/36/auto | 287.11×49.00 (1)   | 268.99×49.00 (1)   | -18.12 | 0.00 |
| rtlBold/sans/24/auto | 191.42×32.00 (1)   | 179.30×32.00 (1)   | -12.12 | 0.00 |
| rtlBold/sans/24/200  | 191.42×32.00 (1)   | 179.30×32.00 (1)   | -12.12 | 0.00 |
| rtlBold/draw/24/auto | 199.13×32.00 (1)   | 187.01×32.00 (1)   | -12.12 | 0.00 |
| rtlBold/draw/24/200  | 199.13×32.00 (1)   | 187.01×32.00 (1)   | -12.12 | 0.00 |

## Rich text by document

Cases: 296

| group                | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |
| -------------------- | ----- | ------ | ------ | ------ | ------ | --------------- |
| all                  | 296   | 47.90  | 0.56   | 1.60   | 0.19   | 0               |
| boldHeading          | 8     | 0.04   | 0.04   | 0.04   | 0.04   | 0               |
| boldItalic           | 8     | 0.04   | 0.04   | 0.00   | 0.00   | 0               |
| boldMidWord          | 8     | 0.05   | 0.05   | 0.00   | 0.00   | 0               |
| boldWord             | 8     | 0.03   | 0.03   | 0.00   | 0.00   | 0               |
| bullets              | 8     | 0.42   | 0.42   | 0.00   | 0.00   | 0               |
| cjkBold              | 8     | 47.90  | 47.90  | 0.00   | 0.00   | 0               |
| code                 | 8     | 0.04   | 0.04   | 0.80   | 0.80   | 0               |
| codeInHeading        | 8     | 0.04   | 0.04   | 0.21   | 0.21   | 0               |
| codeOnly             | 8     | 0.01   | 0.01   | 0.40   | 0.40   | 0               |
| doubleHardBreak      | 8     | 0.01   | 0.01   | 0.00   | 0.00   | 0               |
| emojiBold            | 8     | 0.04   | 0.04   | 0.00   | 0.00   | 0               |
| emptyDoc             | 8     | 0.00   | 0.00   | 0.00   | 0.00   | 0               |
| emptyPara            | 8     | 0.01   | 0.01   | 0.00   | 0.00   | 0               |
| h1                   | 8     | 0.01   | 0.01   | 0.04   | 0.04   | 0               |
| h2                   | 8     | 0.01   | 0.01   | 0.03   | 0.03   | 0               |
| h3                   | 8     | 0.09   | 0.09   | 0.03   | 0.03   | 0               |
| hardBreak            | 8     | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| headingWrap          | 8     | 0.02   | 0.02   | 0.21   | 0.21   | 0               |
| headings             | 8     | 0.02   | 0.02   | 0.04   | 0.04   | 0               |
| highlight            | 8     | 0.04   | 0.04   | 0.00   | 0.00   | 0               |
| italic               | 8     | 0.06   | 0.06   | 0.00   | 0.00   | 0               |
| link                 | 8     | 0.03   | 0.03   | 0.00   | 0.00   | 0               |
| listThenPara         | 8     | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| listWrap             | 8     | 0.45   | 0.45   | 0.00   | 0.00   | 0               |
| longCode             | 8     | 0.01   | 0.01   | 1.60   | 1.60   | 0               |
| multiLineMixed       | 8     | 0.12   | 0.12   | 0.40   | 0.40   | 0               |
| nestedBullets        | 8     | 0.84   | 0.84   | 0.00   | 0.00   | 0               |
| numbered             | 8     | 0.42   | 0.42   | 0.00   | 0.00   | 0               |
| numberedStart        | 8     | 0.42   | 0.42   | 0.00   | 0.00   | 0               |
| plainPara            | 8     | 0.01   | 0.01   | 0.00   | 0.00   | 0               |
| punctuationAfterMark | 8     | 0.06   | 0.06   | 0.00   | 0.00   | 0               |
| rtlBold              | 8     | 18.13  | 18.13  | 0.00   | 0.00   | 0               |
| spacesAroundMarks    | 8     | 0.03   | 0.03   | 0.00   | 0.00   | 0               |
| strike               | 8     | 0.03   | 0.03   | 0.00   | 0.00   | 0               |
| tenItems             | 8     | 0.65   | 0.65   | 0.00   | 0.00   | 0               |
| trailingHardBreak    | 8     | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| twoParas             | 8     | 0.02   | 0.02   | 0.00   | 0.00   | 0               |

### Worst 10 cases

| case                 | chrome w×h (lines) | engine w×h (lines) | dw     | dh   |
| -------------------- | ------------------ | ------------------ | ------ | ---- |
| cjkBold/sans/36/auto | 359.30×49.00 (1)   | 311.40×49.00 (1)   | -47.90 | 0.00 |
| cjkBold/draw/36/auto | 359.30×49.00 (1)   | 311.40×49.00 (1)   | -47.90 | 0.00 |
| cjkBold/sans/24/auto | 240.13×32.00 (1)   | 207.60×32.00 (1)   | -32.52 | 0.00 |
| cjkBold/draw/24/auto | 240.13×32.00 (1)   | 207.60×32.00 (1)   | -32.52 | 0.00 |
| rtlBold/draw/36/auto | 298.67×49.00 (1)   | 280.54×49.00 (1)   | -18.13 | 0.00 |
| rtlBold/sans/36/auto | 287.11×49.00 (1)   | 268.99×49.00 (1)   | -18.12 | 0.00 |
| rtlBold/sans/24/auto | 191.42×32.00 (1)   | 179.30×32.00 (1)   | -12.12 | 0.00 |
| rtlBold/sans/24/200  | 191.42×32.00 (1)   | 179.30×32.00 (1)   | -12.12 | 0.00 |
| rtlBold/draw/24/auto | 199.13×32.00 (1)   | 187.01×32.00 (1)   | -12.12 | 0.00 |
| rtlBold/draw/24/200  | 199.13×32.00 (1)   | 187.01×32.00 (1)   | -12.12 | 0.00 |

## Native SVG pixel diff

Cases: 272. Differing pixels as a share of the box, luminance threshold 48/255.

| renderer                                     | max    | p95   | median |
| -------------------------------------------- | ------ | ----- | ------ |
| Chromium (native svg vs foreignObject)       | 9.03%  | 6.22% | 0.17%  |
| resvg (native svg vs Chromium foreignObject) | 12.65% | 9.54% | 4.48%  |

### Worst 10 (resvg)

| case                       | size     | chromium | resvg  |
| -------------------------- | -------- | -------- | ------ |
| tenItems/draw/24/auto      | 133×320  | 8.99%    | 12.65% |
| tenItems/draw/24/200       | 133×320  | 8.99%    | 12.65% |
| strike/draw/24/auto        | 267×32   | 1.12%    | 11.68% |
| headingWrap/draw/36/auto   | 2582×113 | 1.81%    | 11.26% |
| numbered/draw/24/auto      | 113×96   | 7.17%    | 11.06% |
| numbered/draw/24/200       | 113×96   | 7.17%    | 11.06% |
| numberedStart/draw/24/auto | 109×96   | 7.28%    | 10.53% |
| numberedStart/draw/24/200  | 109×96   | 7.28%    | 10.53% |
| listWrap/draw/24/auto      | 835×32   | 5.66%    | 9.91%  |
| bullets/draw/24/auto       | 176×96   | 6.15%    | 9.82%  |

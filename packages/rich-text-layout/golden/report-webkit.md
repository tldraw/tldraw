# Golden drift report

Generated 2026-08-25T13:34:12.495Z

## Plain text

Cases: 1120

| group | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |
| ----- | ----- | ------ | ------ | ------ | ------ | --------------- |
| all   | 1120  | 202.82 | 28.14  | 59.00  | 0.00   | 42              |
| draw  | 280   | 95.71  | 21.45  | 59.00  | 0.00   | 10              |
| mono  | 280   | 202.82 | 41.34  | 59.00  | 0.00   | 13              |
| sans  | 280   | 95.71  | 0.85   | 59.00  | 0.00   | 8               |
| serif | 280   | 115.58 | 36.18  | 59.00  | 0.00   | 11              |

### Worst 10 cases

| case                   | chrome w×h (lines) | engine w×h (lines) | dw      | dh   |
| ---------------------- | ------------------ | ------------------ | ------- | ---- |
| arabic/mono/44/auto    | 792.11×59.00 (1)   | 589.29×59.00 (1)   | -202.82 | 0.00 |
| arabic/mono/36/auto    | 648.09×49.00 (1)   | 482.15×49.00 (1)   | -165.94 | 0.00 |
| hebrew/serif/44/auto   | 438.41×59.00 (1)   | 553.99×59.00 (1)   | 115.58  | 0.00 |
| arabic/mono/24/auto    | 432.06×32.00 (1)   | 321.43×32.00 (1)   | -110.63 | 0.00 |
| japanese/draw/44/auto  | 704.67×59.00 (1)   | 608.96×59.00 (1)   | -95.71  | 0.00 |
| japanese/sans/44/auto  | 704.67×59.00 (1)   | 608.96×59.00 (1)   | -95.71  | 0.00 |
| japanese/mono/44/auto  | 704.67×59.00 (1)   | 608.96×59.00 (1)   | -95.71  | 0.00 |
| japanese/serif/44/auto | 704.00×59.00 (1)   | 608.96×59.00 (1)   | -95.04  | 0.00 |
| hebrew/serif/36/auto   | 358.70×49.00 (1)   | 453.24×49.00 (1)   | 94.54   | 0.00 |
| arabic/draw/44/auto    | 623.14×59.00 (1)   | 532.74×59.00 (1)   | -90.40  | 0.00 |

### Line-count mismatches (42)

- paragraph/draw/36/200: chrome 29, engine 30
- url/draw/18/200: chrome 4, engine 3
- url/draw/24/200: chrome 6, engine 5
- url/sans/18/200: chrome 4, engine 3
- url/sans/24/200: chrome 5, engine 4
- url/sans/36/200: chrome 7, engine 6
- url/sans/44/200: chrome 8, engine 7
- url/serif/18/200: chrome 4, engine 3
- url/serif/24/200: chrome 6, engine 5
- url/serif/36/200: chrome 7, engine 6
- url/serif/44/200: chrome 8, engine 7
- url/mono/24/200: chrome 6, engine 5
- url/mono/36/200: chrome 8, engine 7
- url/mono/44/200: chrome 10, engine 9
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
- arabic/draw/44/200: chrome 4, engine 3
- arabic/mono/24/200: chrome 3, engine 2
- arabic/mono/36/200: chrome 4, engine 3
- arabic/mono/44/200: chrome 5, engine 4
- hebrew/serif/18/200: chrome 1, engine 2
- hebrew/serif/36/200: chrome 2, engine 3
- hebrew/serif/44/200: chrome 3, engine 4
- hebrew/mono/44/200: chrome 5, engine 4
- mixedDirection/draw/18/200: chrome 2, engine 1
- longWords/draw/36/200: chrome 6, engine 7

## Plain text by case

Cases: 1120

| group           | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |
| --------------- | ----- | ------ | ------ | ------ | ------ | --------------- |
| all             | 1120  | 202.82 | 28.14  | 59.00  | 0.00   | 42              |
| arabic          | 32    | 202.82 | 165.94 | 59.00  | 59.00  | 4               |
| caps            | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| chinese         | 32    | 72.92  | 72.92  | 59.00  | 59.00  | 12              |
| combining       | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| emoji           | 32    | 16.04  | 16.01  | 0.00   | 0.00   | 0               |
| emptyLines      | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| german          | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| hebrew          | 32    | 115.58 | 94.54  | 59.00  | 59.00  | 4               |
| hyphenated      | 32    | 8.81   | 7.21   | 0.00   | 0.00   | 0               |
| japanese        | 32    | 95.71  | 95.71  | 49.00  | 49.00  | 4               |
| korean          | 32    | 88.45  | 72.38  | 0.00   | 0.00   | 0               |
| leadingSpaces   | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| longWord        | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| longWords       | 32    | 0.02   | 0.01   | 49.00  | 0.00   | 1               |
| manyWords       | 32    | 0.31   | 0.17   | 0.00   | 0.00   | 0               |
| mixedDirection  | 32    | 51.57  | 42.19  | 24.00  | 0.00   | 1               |
| multiLine       | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| nbsp            | 32    | 0.02   | 0.01   | 0.00   | 0.00   | 0               |
| numbers         | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| pangram         | 32    | 0.05   | 0.05   | 0.00   | 0.00   | 0               |
| paragraph       | 32    | 0.17   | 0.16   | 49.00  | 0.00   | 1               |
| punctuation     | 32    | 0.05   | 0.04   | 0.00   | 0.00   | 0               |
| repeatedSpaces  | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| short           | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| singleSpace     | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| tabLines        | 32    | 0.04   | 0.04   | 0.00   | 0.00   | 0               |
| tabs            | 32    | 0.08   | 0.08   | 0.00   | 0.00   | 0               |
| thai            | 32    | 62.21  | 50.91  | 59.00  | 32.00  | 2               |
| trailingNewline | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| trailingSpaces  | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| two             | 32    | 0.02   | 0.02   | 0.00   | 0.00   | 0               |
| unbreakable     | 32    | 0.02   | 0.01   | 0.00   | 0.00   | 0               |
| url             | 32    | 4.24   | 3.97   | 59.00  | 59.00  | 13              |
| vietnamese      | 32    | 0.04   | 0.03   | 0.00   | 0.00   | 0               |
| zeroWidth       | 32    | 0.58   | 0.56   | 0.00   | 0.00   | 0               |

### Worst 10 cases

| case                   | chrome w×h (lines) | engine w×h (lines) | dw      | dh   |
| ---------------------- | ------------------ | ------------------ | ------- | ---- |
| arabic/mono/44/auto    | 792.11×59.00 (1)   | 589.29×59.00 (1)   | -202.82 | 0.00 |
| arabic/mono/36/auto    | 648.09×49.00 (1)   | 482.15×49.00 (1)   | -165.94 | 0.00 |
| hebrew/serif/44/auto   | 438.41×59.00 (1)   | 553.99×59.00 (1)   | 115.58  | 0.00 |
| arabic/mono/24/auto    | 432.06×32.00 (1)   | 321.43×32.00 (1)   | -110.63 | 0.00 |
| japanese/draw/44/auto  | 704.67×59.00 (1)   | 608.96×59.00 (1)   | -95.71  | 0.00 |
| japanese/sans/44/auto  | 704.67×59.00 (1)   | 608.96×59.00 (1)   | -95.71  | 0.00 |
| japanese/mono/44/auto  | 704.67×59.00 (1)   | 608.96×59.00 (1)   | -95.71  | 0.00 |
| japanese/serif/44/auto | 704.00×59.00 (1)   | 608.96×59.00 (1)   | -95.04  | 0.00 |
| hebrew/serif/36/auto   | 358.70×49.00 (1)   | 453.24×49.00 (1)   | 94.54   | 0.00 |
| arabic/draw/44/auto    | 623.14×59.00 (1)   | 532.74×59.00 (1)   | -90.40  | 0.00 |

### Line-count mismatches (42)

- paragraph/draw/36/200: chrome 29, engine 30
- url/draw/18/200: chrome 4, engine 3
- url/draw/24/200: chrome 6, engine 5
- url/sans/18/200: chrome 4, engine 3
- url/sans/24/200: chrome 5, engine 4
- url/sans/36/200: chrome 7, engine 6
- url/sans/44/200: chrome 8, engine 7
- url/serif/18/200: chrome 4, engine 3
- url/serif/24/200: chrome 6, engine 5
- url/serif/36/200: chrome 7, engine 6
- url/serif/44/200: chrome 8, engine 7
- url/mono/24/200: chrome 6, engine 5
- url/mono/36/200: chrome 8, engine 7
- url/mono/44/200: chrome 10, engine 9
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
- arabic/draw/44/200: chrome 4, engine 3
- arabic/mono/24/200: chrome 3, engine 2
- arabic/mono/36/200: chrome 4, engine 3
- arabic/mono/44/200: chrome 5, engine 4
- hebrew/serif/18/200: chrome 1, engine 2
- hebrew/serif/36/200: chrome 2, engine 3
- hebrew/serif/44/200: chrome 3, engine 4
- hebrew/mono/44/200: chrome 5, engine 4
- mixedDirection/draw/18/200: chrome 2, engine 1
- longWords/draw/36/200: chrome 6, engine 7

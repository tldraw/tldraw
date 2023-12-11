// const test = `
// \`\`\`sequence
// TOOL draw;
// MOVE 50 -50;
// DOWN;
// MOVE 25 -37.5;
// MOVE 0 0;
// MOVE 25 37.5;
// MOVE 50 50;
// UP;
// \`\`\``

// const test2 = `
// Sure, to do this, major steps involve:

// 1. Calculating the size of each box.
// 2. Calculating the coordinate for the top-left corner of each box in the 3x3 grid as (x,y).

// Given the viewport w=971 h=609, proposing 3 boxes horizontally and vertically, we can make each box of size w/3 by h/3.

// Let's start drawing:

// \`\`\`sequence
// TOOL box;
// MOVE 314 137; DOWN; MOVE 628 411; UP;
// MOVE 628 137; DOWN; MOVE 942 411; UP;
// MOVE 942 137; DOWN; MOVE 1256 411; UP;
// MOVE 314 411; DOWN; MOVE 628 685; UP;
// MOVE 628 411; DOWN; MOVE 942 685; UP;
// MOVE 942 411; DOWN; MOVE 1256 685; UP;
// \`\`\`
// Note: All positions and dimensions are approximations considering the viewport size of 971x609.

// Also, if you need boxes with specific dimensions, it might be needed to adjust the viewport size accordingly.

// `

// const test3 = `\`\`\`sequence
// // select the bottom shape
// TOOL select;
// CLICK -836 126;

// // move the shape to desired location for bottom of snowman
// TOOL select;
// DRAG -836 126 -650 100;

// // select the middle shape
// TOOL select;
// CLICK -630 94;

// // move the shape to align center with bottom shape and place on top
// TOOL select;
// DRAG -630 94 -650 50;

// // select the top shape
// TOOL select;
// CLICK -313 -71.5;

// // move the shape to align center with middle shape and place on top
// TOOL select;
// DRAG -313 -71.5 -650 10;
// \`\`\``

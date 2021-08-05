declare namespace terminalSize {
	interface Size {
		columns: number;
		rows: number;
	}
}

/**
Reliably get the terminal window size.

@example
```
import terminalSize = require('term-size');

terminalSize();
//=> {columns: 143, rows: 24}
```
*/
declare function terminalSize(): terminalSize.Size;

export = terminalSize;

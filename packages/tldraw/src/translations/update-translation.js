/* eslint-disable */

const fs = require('fs');
const process = require('process');
const traverse = require('traverse');
const mainLang = require('./main.json');

const [ targetLangFile ] = process.argv.slice(-1);

if (!targetLangFile) {
    console.log('No target language file specified');
    process.exit(1);
}

const targetLang = require(`./${targetLangFile}`);

const paths = traverse(mainLang).reduce(function(acc, item) {
    if (this.isLeaf) {
        acc.push(this.path);
    }

    return acc;
}, []);

const result = {};

for (const path of paths) {
    if (traverse(targetLang).has(path)) {
        traverse(result).set(path, traverse(targetLang).get(path));
    } else {
        //console.log(`${path.join('.')} is missing`);
        traverse(result).set(path, '');
    }
}

const data = JSON.stringify(result, undefined, 4);

fs.writeFileSync(`./${targetLangFile}`, data);

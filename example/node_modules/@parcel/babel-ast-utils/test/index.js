import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {parse as babelParse} from '@babel/parser';
import {generateAST} from '../src';

const FIXTURES_FOLDER = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FIXTURES_FOLDER).sort();
const options = {
  allowReturnOutsideFunction: true,
  strictMode: false,
  sourceType: 'module',
};

describe('astring babel generator', () => {
  files.forEach(filename => {
    it(filename, function() {
      const code = fs.readFileSync(
        path.join(FIXTURES_FOLDER, filename),
        'utf8',
      );
      const ast = babelParse(code, options);
      let {content} = generateAST({
        ast,
        sourceFileName: '/foo/bar.js',
        sourceMaps: false,
        originalSourceMap: null,
        options: {projectRoot: '/foo'},
      });
      if (filename === 'valid-only.js') {
        babelParse(content), options;
      } else {
        assert.equal(
          content,
          code,
          filename.substring(0, filename.length - 3),
          'Generates code with the expected format',
        );
      }
    });
  });
});

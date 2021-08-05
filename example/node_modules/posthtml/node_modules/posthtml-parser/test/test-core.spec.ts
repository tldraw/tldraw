import test from 'ava';
import { parser } from '../src';

test('should be parse doctype in uppercase', t => {
  const tree = parser('<!DOCTYPE html>');
  const expected = ['<!DOCTYPE html>'];
  t.deepEqual(tree, expected);
});

test('should be parse comment', t => {
  const tree = parser('<!--comment-->');
  const expected = ['<!--comment-->'];
  t.deepEqual(tree, expected);
});

test('should be parse CDATA', t => {
  const tree = parser('<script><![CDATA[console.log(1);]]></script>', { xmlMode: true });
  const expected = [{ tag: 'script', content: ['console.log(1);'] }];
  t.deepEqual(tree, expected);
});

test('should be parse tag with escape object in attribute', t => {
  const html = '<button data-bem="{&quot;button&quot;:{&quot;checkedView&quot;:&quot;extra&quot;}}"' +
    ' type="submit"></button>';
  const tree = parser(html);
  const expected = [
    {
      tag: 'button',
      attrs: {
        type: 'submit',
        'data-bem': '{"button":{"checkedView":"extra"}}'
      }
    }
  ];
  t.deepEqual(tree, expected);
});

test.skip('should be parse tag with object in attribute data witchout escape', t => {
  const html = '<button data-bem="{"button":{"checkedView":"extra"}}"' +
    ' type="submit"></button>';
  const tree = parser(html);
  const expected = [
    {
      tag: 'button',
      attrs: {
        type: 'submit',
        'data-bem': '{"button":{"checkedView":"extra"}}'
      }
    }
  ];
  t.deepEqual(tree, expected);
});

test.skip('should be parse tag with object in attribute data escape', t => {
  const json = JSON.stringify({ button: { checkedView: 'extra' } });
  const html = '<button data-bem="' + json + '"' +
    ' type="submit"></button>';
  const tree = parser(html);
  const expected = [
    {
      tag: 'button',
      attrs: {
        type: 'submit',
        'data-bem': '{"button":{"checkedView":"extra"}}'
      }
    }
  ];
  t.deepEqual(tree, expected);
});

test('should be parse isolated comment', t => {
  const tree = parser('<div><!--comment--></div>');
  const expected = [{ tag: 'div', content: ['<!--comment-->'] }];
  t.deepEqual(tree, expected);
});

test('should be parse comment before text content', t => {
  const tree = parser('<div><!--comment-->Text after comment</div>');
  const expected = [{ tag: 'div', content: ['<!--comment-->', 'Text after comment'] }];
  t.deepEqual(tree, expected);
});

test('should be parse comment after text content', t => {
  const tree = parser('<div>Text before comment.<!--comment--></div>');
  const expected = [{ tag: 'div', content: ['Text before comment.', '<!--comment-->'] }];
  t.deepEqual(tree, expected);
});

test('should be parse comment in the middle of text content', t => {
  const tree = parser('<div>Text surrounding <!--comment--> a comment.</div>');
  const expected = [{ tag: 'div', content: ['Text surrounding ', '<!--comment-->', ' a comment.'] }];
  t.deepEqual(tree, expected);
});

test('should be parse doctype', t => {
  const tree = parser('<!doctype html>');
  const expected = ['<!doctype html>'];
  t.deepEqual(tree, expected);
});

test('should be parse directive', t => {
  const options = {
    directives: [
      { name: '?php', start: '<', end: '>' }
    ]
  };
  const tree = parser('<?php echo "Hello word"; ?>', options);
  const expected = ['<?php echo "Hello word"; ?>'];
  t.deepEqual(tree, expected);
});

test('should be parse regular expression directive', t => {
  const options = {
    directives: [
      { name: /\?(php|=).*/, start: '<', end: '>' }
    ]
  };
  const tree1 = parser('<?php echo "Hello word"; ?>', options);
  const expected1 = ['<?php echo "Hello word"; ?>'];
  const tree2 = parser('<?="Hello word"?>', options);
  const expected2 = ['<?="Hello word"?>'];

  t.deepEqual(tree1, expected1);
  t.deepEqual(tree2, expected2);
});

test('should be parse directives and tag', t => {
  const options = {
    directives: [
      { name: '!doctype', start: '<', end: '>' },
      { name: '?php', start: '<', end: '>' }
    ]
  };
  const html = '<!doctype html><header><?php echo "Hello word"; ?></header><body>{{%njk test %}}</body>';
  const tree = parser(html, options);
  const expected = [
    '<!doctype html>',
    {
      content: ['<?php echo "Hello word"; ?>'],
      tag: 'header'
    },
    {
      content: ['{{%njk test %}}'],
      tag: 'body'
    }
  ];
  t.deepEqual(tree, expected);
});

test('should be parse tag', t => {
  const tree = parser('<html></html>');
  const expected = [{ tag: 'html' }];
  t.deepEqual(tree, expected);
});

test('should be parse doctype and tag', t => {
  const tree = parser('<!doctype html><html></html>');
  const expected = ['<!doctype html>', { tag: 'html' }];
  t.deepEqual(tree, expected);
});

test('should be parse tag attrs', t => {
  const tree = parser('<div id="id" class="class"></div>');
  const expected = [{
    tag: 'div', attrs: { id: 'id', class: 'class' }
  }];
  t.deepEqual(tree, expected);
});

test('should be parse text', t => {
  const tree = parser('Text');
  const expected = ['Text'];
  t.deepEqual(tree, expected);
});

test('should be parse text in content', t => {
  const tree = parser('<div>Text</div>');
  const expected = [{ tag: 'div', content: ['Text'] }];
  t.deepEqual(tree, expected);
});

test('should be parse not a single node in tree', t => {
  const tree = parser('<span>Text1</span><span>Text2</span>Text3');
  const expected = [
    { tag: 'span', content: ['Text1'] }, { tag: 'span', content: ['Text2'] }, 'Text3'
  ];
  t.deepEqual(tree, expected);
});

test('should be parse not a single node in parent content', t => {
  const tree = parser('<div><span>Text1</span><span>Text2</span>Text3</div>');
  const expected = [
    { tag: 'div', content: [{ tag: 'span', content: ['Text1'] }, { tag: 'span', content: ['Text2'] }, 'Text3'] }
  ];
  t.deepEqual(tree, expected);
});

test('should be parse camelCase tag name', t => {
  const tree = parser('<mySuperTag></mySuperTag>');
  const expected = [
    { tag: 'mySuperTag' }
  ];
  t.deepEqual(tree, expected);
});

test('should be parse simple contents are split with "<" in comment', t => {
  const html = '<a> /* width < 800px */ <hr /> test</a>';
  const tree = parser(html);
  const expected = [
    { tag: 'a', content: [' /* width < 800px */ ', { tag: 'hr' }, ' test'] }
  ];
  t.deepEqual(tree, expected);
});

test('should be parse style contents are split with "<" in comment', t => {
  const html = '<style> /* width < 800px */ @media (max-width: 800px) { /* selectors */} </style>';
  const tree = parser(html);
  const expected = [
    { tag: 'style', content: [' /* width < 800px */ @media (max-width: 800px) { /* selectors */} '] }
  ];
  t.deepEqual(tree, expected);
});

test('should be parse script contents are split with "<" in comment', t => {
  const html = '<script> var str = \'hey <form\'; if (!str.match(new RegExp(\'<(form|iframe)\', \'g\'))) { /* ... */ }</script>';
  const tree = parser(html);
  const expected = [
    {
      tag: 'script',
      content: [
        ' var str = \'hey <form\'; if (!str.match(new RegExp(\'<(form|iframe)\', \'g\'))) { /* ... */ }'
      ]
    }
  ];
  t.deepEqual(tree, expected);
});

test('should be not converting html entity name', t => {
  const html = '&zwnj;&nbsp;&copy;';
  const tree = parser(html);
  const expected = ['&zwnj;&nbsp;&copy;'];
  t.deepEqual(tree, expected);
});

test('should parse with source locations', t => {
  const html = '<h1>Test</h1>\n<p><b>Foo</b></p>';
  const tree = parser(html, { sourceLocations: true });
  const expected = [
    {
      tag: 'h1',
      content: ['Test'],
      location: {
        start: {
          line: 1,
          column: 1
        },
        end: {
          line: 1,
          column: 13
        }
      }
    },
    '\n',
    {
      tag: 'p',
      content: [
        {
          tag: 'b',
          content: ['Foo'],
          location: {
            start: {
              line: 2,
              column: 4
            },
            end: {
              line: 2,
              column: 13
            }
          }
        }
      ],
      location: {
        start: {
          line: 2,
          column: 1
        },
        end: {
          line: 2,
          column: 17
        }
      }
    }
  ];
  t.deepEqual(tree, expected);
});

test('should parse with input in button', t => {
  const html = '<button >Hello <input type="file" ng-hide="true" />PostHtml</button>';
  const tree = parser(html, { xmlMode: true });
  const expected = [
    {
      tag: 'button',
      content: [
        'Hello ',
        {
          tag: 'input',
          attrs: {
            type: 'file',
            'ng-hide': 'true'
          }
        },
        'PostHtml'
      ]
    }
  ];
  t.deepEqual(tree, expected);
});

'use strict';

const { expect } = require('chai');
const { computeStyle } = require('./style.js');
const { querySelector } = require('./xast.js');
const svg2js = require('./svgo/svg2js.js');

describe('computeStyle', () => {
  it('collects styles', () => {
    const root = svg2js(`
      <svg>
        <rect id="class" class="a" />
        <rect id="two-classes" class="b a" />
        <rect id="attribute" fill="purple" />
        <rect id="inline-style" style="fill: grey;" />
        <g fill="yellow">
          <rect id="inheritance" />
          <g style="fill: blue;">
            <g>
              <rect id="nested-inheritance" />
            </g>
          </g>
        </g>
        <style>
          .a { fill: red; }
        </style>
        <style>
          <![CDATA[
            .b { fill: green; stroke: black; }
          ]]>
        </style>
      </svg>
    `);
    expect(computeStyle(querySelector(root, '#class'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'red' },
    });
    expect(computeStyle(querySelector(root, '#two-classes'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'green' },
      stroke: { type: 'static', inherited: false, value: 'black' },
    });
    expect(computeStyle(querySelector(root, '#attribute'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'purple' },
    });
    expect(computeStyle(querySelector(root, '#inline-style'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'grey' },
    });
    expect(computeStyle(querySelector(root, '#inheritance'))).to.deep.equal({
      fill: { type: 'static', inherited: true, value: 'yellow' },
    });
    expect(
      computeStyle(querySelector(root, '#nested-inheritance'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: true, value: 'blue' },
    });
  });

  it('prioritizes different kinds of styles', () => {
    const root = svg2js(`
      <svg>
        <style>
          g > .a { fill: red; }
          .a { fill: green; }
          .b { fill: blue; }
        </style>
        <g fill="yellow">
          <rect id="complex-selector" class="a" />
          <rect id="attribute-over-inheritance" fill="orange" />
          <rect id="style-rule-over-attribute" class="b" fill="grey" />
          <rect id="inline-style-over-style-rule" style="fill: purple;" class="b" />
        </g>
      </svg>
    `);
    expect(
      computeStyle(querySelector(root, '#complex-selector'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'red' },
    });
    expect(
      computeStyle(querySelector(root, '#attribute-over-inheritance'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'orange' },
    });
    expect(
      computeStyle(querySelector(root, '#style-rule-over-attribute'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'blue' },
    });
    expect(
      computeStyle(querySelector(root, '#inline-style-over-style-rule'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'purple' },
    });
  });

  it('prioritizes important styles', () => {
    const root = svg2js(`
      <svg>
        <style>
          g > .a { fill: red; }
          .b { fill: green !important; }
        </style>
        <rect id="complex-selector" class="a b" />
        <rect id="style-rule-over-inline-style" style="fill: orange;" class="b" />
        <rect id="inline-style-over-style-rule" style="fill: purple !important;" class="b" />
      </svg>
    `);
    expect(
      computeStyle(querySelector(root, '#complex-selector'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'green' },
    });
    expect(
      computeStyle(querySelector(root, '#style-rule-over-inline-style'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'green' },
    });
    expect(
      computeStyle(querySelector(root, '#inline-style-over-style-rule'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'purple' },
    });
  });

  it('treats at-rules and pseudo-classes as dynamic styles', () => {
    const root = svg2js(`
      <svg>
        <style>
          @media screen {
            .a { fill: red; }
          }
          .b:hover { fill: green; }
          .c { fill: blue; }
          .d { fill: purple; }
        </style>
        <rect id="media-query" class="a d" style="fill: orange;" />
        <rect id="hover" class="b" style="fill: yellow;" />
        <g class="a">
          <rect id="inherited" />
          <rect id="inherited-overriden" class="c" />
        </g>
        <rect id="static" class="c" style="fill: black" />
      </svg>
    `);
    expect(computeStyle(querySelector(root, '#media-query'))).to.deep.equal({
      fill: { type: 'dynamic', inherited: false },
    });
    expect(computeStyle(querySelector(root, '#hover'))).to.deep.equal({
      fill: { type: 'dynamic', inherited: false },
    });
    expect(computeStyle(querySelector(root, '#inherited'))).to.deep.equal({
      fill: { type: 'dynamic', inherited: true },
    });
    expect(
      computeStyle(querySelector(root, '#inherited-overriden'))
    ).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'blue' },
    });
    expect(computeStyle(querySelector(root, '#static'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'black' },
    });
  });

  it('considers <style> media attribute', () => {
    const root = svg2js(`
      <svg>
        <style media="print">
          @media screen {
            .a { fill: red; }
          }
          .b { fill: green; }
        </style>
        <style media="all">
          .c { fill: blue; }
        </style>
        <rect id="media-query" class="a" />
        <rect id="kinda-static" class="b" />
        <rect id="static" class="c" />
      </svg>
    `);
    expect(computeStyle(querySelector(root, '#media-query'))).to.deep.equal({
      fill: { type: 'dynamic', inherited: false },
    });
    expect(computeStyle(querySelector(root, '#kinda-static'))).to.deep.equal({
      fill: { type: 'dynamic', inherited: false },
    });
    expect(computeStyle(querySelector(root, '#static'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'blue' },
    });
  });

  it('ignores <style> with invalid type', () => {
    const root = svg2js(`
      <svg>
        <style type="text/css">
          .a { fill: red; }
        </style>
        <style type="">
          .b { fill: green; }
        </style>
        <style type="text/invalid">
          .c { fill: blue; }
        </style>
        <rect id="valid-type" class="a" />
        <rect id="empty-type" class="b" />
        <rect id="invalid-type" class="c" />
      </svg>
    `);
    expect(computeStyle(querySelector(root, '#valid-type'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'red' },
    });
    expect(computeStyle(querySelector(root, '#empty-type'))).to.deep.equal({
      fill: { type: 'static', inherited: false, value: 'green' },
    });
    expect(computeStyle(querySelector(root, '#invalid-type'))).to.deep.equal(
      {}
    );
  });

  it('ignores keyframes atrule', () => {
    const root = svg2js(`
      <svg>
        <style>
          .a {
            animation: loading 4s linear infinite;
          }
          @keyframes loading {
            0% {
              stroke-dashoffset: 440;
            }
            50% {
              stroke-dashoffset: 0;
            }
            50.1% {
              stroke-dashoffset: 880;
            }
          }
        </style>
        <rect id="element" class="a" />
      </svg>
    `);
    expect(computeStyle(querySelector(root, '#element'))).to.deep.equal({
      animation: {
        type: 'static',
        inherited: false,
        value: 'loading 4s linear infinite',
      },
    });
  });
});

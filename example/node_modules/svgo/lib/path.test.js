'use strict';

const { expect } = require('chai');
const { parsePathData, stringifyPathData } = require('./path.js');

describe('parse path data', () => {
  it('should allow spaces between commands', () => {
    expect(parsePathData('M0 10 L \n\r\t20 30')).to.deep.equal([
      { command: 'M', args: [0, 10] },
      { command: 'L', args: [20, 30] },
    ]);
  });
  it('should allow spaces and commas between arguments', () => {
    expect(parsePathData('M0 , 10 L 20 \n\r\t30,40,50')).to.deep.equal([
      { command: 'M', args: [0, 10] },
      { command: 'L', args: [20, 30] },
      { command: 'L', args: [40, 50] },
    ]);
  });
  it('should forbid commas before commands', () => {
    expect(parsePathData(', M0 10')).to.deep.equal([]);
  });
  it('should forbid commas between commands', () => {
    expect(parsePathData('M0,10 , L 20,30')).to.deep.equal([
      { command: 'M', args: [0, 10] },
    ]);
  });
  it('should forbid commas between command name and argument', () => {
    expect(parsePathData('M0,10 L,20,30')).to.deep.equal([
      { command: 'M', args: [0, 10] },
    ]);
  });
  it('should forbid multipe commas in a row', () => {
    expect(parsePathData('M0 , , 10')).to.deep.equal([]);
  });
  it('should stop when unknown char appears', () => {
    expect(parsePathData('M0 10 , L 20 #40')).to.deep.equal([
      { command: 'M', args: [0, 10] },
    ]);
  });
  it('should stop when not enough arguments', () => {
    expect(parsePathData('M0 10 L 20 L 30 40')).to.deep.equal([
      { command: 'M', args: [0, 10] },
    ]);
  });
  it('should stop if moveto not the first command', () => {
    expect(parsePathData('L 10 20')).to.deep.equal([]);
    expect(parsePathData('10 20')).to.deep.equal([]);
  });
  it('should stop on invalid scientific notation', () => {
    expect(parsePathData('M 0 5e++1 L 0 0')).to.deep.equal([
      { command: 'M', args: [0, 5] },
    ]);
  });
  it('should stop on invalid numbers', () => {
    expect(parsePathData('M ...')).to.deep.equal([]);
  });
  it('should handle arcs', () => {
    expect(
      parsePathData(
        `
          M600,350
          l 50,-25
          a25,25 -30 0,1 50,-25
          25,50 -30 0,1 50,-25
          25,75 -30 01.2,-25
          a25,100 -30 0150,-25
          l 50,-25
        `
      )
    ).to.deep.equal([
      { command: 'M', args: [600, 350] },
      { command: 'l', args: [50, -25] },
      { command: 'a', args: [25, 25, -30, 0, 1, 50, -25] },
      { command: 'a', args: [25, 50, -30, 0, 1, 50, -25] },
      { command: 'a', args: [25, 75, -30, 0, 1, 0.2, -25] },
      { command: 'a', args: [25, 100, -30, 0, 1, 50, -25] },
      { command: 'l', args: [50, -25] },
    ]);
  });
});

describe('stringify path data', () => {
  it('should combine sequence of the same commands', () => {
    expect(
      stringifyPathData({
        pathData: [
          { command: 'M', args: [0, 0] },
          { command: 'h', args: [10] },
          { command: 'h', args: [20] },
          { command: 'h', args: [30] },
          { command: 'H', args: [40] },
          { command: 'H', args: [50] },
        ],
      })
    ).to.equal('M0 0h10 20 30H40 50');
  });
  it('should not combine sequence of moveto', () => {
    expect(
      stringifyPathData({
        pathData: [
          { command: 'M', args: [0, 0] },
          { command: 'M', args: [10, 10] },
          { command: 'm', args: [20, 30] },
          { command: 'm', args: [40, 50] },
        ],
      })
    ).to.equal('M0 0M10 10m20 30m40 50');
  });
  it('should combine moveto and sequence of lineto', () => {
    expect(
      stringifyPathData({
        pathData: [
          { command: 'M', args: [0, 0] },
          { command: 'l', args: [10, 10] },
          { command: 'M', args: [0, 0] },
          { command: 'l', args: [10, 10] },
          { command: 'M', args: [0, 0] },
          { command: 'L', args: [10, 10] },
        ],
      })
    ).to.equal('m0 0 10 10M0 0l10 10M0 0 10 10');
    expect(
      stringifyPathData({
        pathData: [
          { command: 'm', args: [0, 0] },
          { command: 'L', args: [10, 10] },
        ],
      })
    ).to.equal('M0 0 10 10');
  });
  it('should avoid space before first, negative and decimals', () => {
    expect(
      stringifyPathData({
        pathData: [
          { command: 'M', args: [0, -1.2] },
          { command: 'L', args: [0.3, 4] },
          { command: 'L', args: [5, -0.6] },
          { command: 'L', args: [7, 0.8] },
        ],
      })
    ).to.equal('M0-1.2.3 4 5-.6 7 .8');
  });
  it('should configure precision', () => {
    const pathData = [
      { command: 'M', args: [0, -1.9876] },
      { command: 'L', args: [0.3, 3.14159265] },
      { command: 'L', args: [-0.3, -3.14159265] },
      { command: 'L', args: [100, 200] },
    ];
    expect(
      stringifyPathData({
        pathData,
        precision: 3,
      })
    ).to.equal('M0-1.988.3 3.142-.3-3.142 100 200');
    expect(
      stringifyPathData({
        pathData,
        precision: 0,
      })
    ).to.equal('M0-2 0 3 0-3 100 200');
  });
  it('allows to avoid spaces after arc flags', () => {
    const pathData = [
      { command: 'M', args: [0, 0] },
      { command: 'A', args: [50, 50, 10, 1, 0, 0.2, 20] },
      { command: 'a', args: [50, 50, 10, 1, 0, 0.2, 20] },
    ];
    expect(
      stringifyPathData({
        pathData,
        disableSpaceAfterFlags: false,
      })
    ).to.equal('M0 0A50 50 10 1 0 .2 20a50 50 10 1 0 .2 20');
    expect(
      stringifyPathData({
        pathData,
        disableSpaceAfterFlags: true,
      })
    ).to.equal('M0 0A50 50 10 10.2 20a50 50 10 10.2 20');
  });
});

'use strict';

const isHTML = require('is-html'),
    isURL = require('is-absolute-url'),
    request = require('request'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    url = require('url');

function isWindows() {
    return os.platform() === 'win32';
}

/**
 * Check if the supplied string might be a RegExp and, if so, return the corresponding RegExp.
 * @param  {String} str     The regex to transform.
 * @return {RegExp|String}  The final RegExp
 */
function strToRegExp(str) {
    if (str[0] === '/') {
        return new RegExp(str.replace(/^\/|\/$/g, ''));
    }
    return str;
}

/**
 * Parse a given uncssrc file.
 * @param  {String} filename The location of the uncssrc file
 * @return {Object}          The options object
 */
function parseUncssrc(filename) {
    let options = JSON.parse(fs.readFileSync(filename, 'utf-8'));

    /* RegExps can't be stored as JSON, therefore we need to parse them manually.
     * A string is a RegExp if it starts with '/', since that wouldn't be a valid CSS selector.
     */
    options.ignore = options.ignore ? options.ignore.map(strToRegExp) : undefined;
    options.ignoreSheets = options.ignoreSheets ? options.ignoreSheets.map(strToRegExp) : [];

    return options;
}

/**
 * Parse paths relatives to a source.
 * @param  {String} source      Where the paths originate from
 * @param  {Array}  stylesheets List of paths
 * @param  {Object} options     Options, as passed to UnCSS
 * @return {Array}              List of paths
 */
function parsePaths(source, stylesheets, options) {
    return stylesheets.map((sheet) => {
        let sourceProtocol;
        const isLocalFile = sheet.substr(0, 5) === 'file:';

        if (sheet.substr(0, 4) === 'http') {
            /* No need to parse, it's already a valid path */
            return sheet;
        }

        /* Check if we are fetching over http(s) */
        if (isURL(source) && !isLocalFile) {
            sourceProtocol = url.parse(source).protocol;

            if (sheet.substr(0, 2) === '//') {
                /* Use the same protocol we used for fetching this page.
                 * Default to http.
                 */
                return sourceProtocol ? sourceProtocol + sheet : 'http:' + sheet;
            }
            return url.resolve(source, sheet);
        }

        /* We are fetching local files
         * Should probably report an error if we find an absolute path and
         *   have no htmlroot specified.
         */
        /* Fix the case when there is a query string or hash */
        sheet = sheet.split('?')[0].split('#')[0];

        /* Path already parsed by jsdom or user supplied local file */
        if (isLocalFile) {
            sheet = url.parse(sheet).path.replace('%20', ' ');
            /* If on windows, remove first '/' */
            sheet = isWindows() ? sheet.substring(1) : sheet;

            if (options.htmlroot) {
                return path.join(options.htmlroot, sheet);
            }
            sheet = path.relative(path.join(path.dirname(source)), sheet);
        }

        if (sheet[0] === '/' && options.htmlroot) {
            return path.join(options.htmlroot, sheet);
        } else if (isHTML(source)) {
            return path.join(options.csspath, sheet);
        }
        return path.join(path.dirname(source), options.csspath, sheet);
    });
}

/**
 * Given an UTF8 string, return a version of this string without the first byte if it corresponds
 *   to the Byte Order Mark
 * @param {String}  utf8String the string to strip
 * @return {String}
 */
function stripBom(utf8String) {
    if (utf8String.charCodeAt(0) === 0xFEFF) {
        return utf8String.substr(1);
    }
    return utf8String;
}

/**
 * Given an array of filenames, return an array of the files' contents,
 *   only if the filename matches a regex
 * @param  {Array}   files  An array of the filenames to read
 * @return {Promise}
 */
function readStylesheets(files, outputBanner) {
    return Promise.all(files.map((filename) => {
        if (isURL(filename)) {
            return new Promise((resolve, reject) => {
                request({
                    url: filename,
                    headers: { 'User-Agent': 'UnCSS' }
                }, (err, response, body) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(body);
                });
            });
        } else if (fs.existsSync(filename)) {
            return new Promise((resolve, reject) => {
                fs.readFile(filename, 'utf-8', (err, contents) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(stripBom(contents));
                });
            });
        }
        throw new Error(`UnCSS: could not open ${path.join(process.cwd(), filename)}`);
    })).then((res) => {
        // res is an array of the content of each file in files (in the same order)
        if (outputBanner) {
            for (let i = 0, len = files.length; i < len; i++) {
                // We append a small banner to keep track of which file we are currently processing
                // super helpful for debugging
                const banner = `/*** uncss> filename: ${files[i].replace(/\\/g, '/')} ***/\n`;
                res[i] = banner + res[i];
            }
        }
        return res;
    });
}

function parseErrorMessage(error, cssStr) {
    /* TODO: FIXME */
    /* Base line for conveying the line number in the error message */
    let zeroLine = 0;

    if (error.line) {
        const lines = cssStr.split('\n');
        if (lines.length) {
            /* We get the filename of the css file that contains the error */
            let i = error.line - 1;
            while (i >= 0 && !error.filename) {
                if (lines[i].substr(0, 21) === '/*** uncss> filename:') {
                    error.filename = lines[i].substring(22, lines[i].length - 4);
                    zeroLine = i;
                }
                i--;
            }
            for (let j = error.line - 6; j < error.line + 5; j++) {
                if (j - zeroLine < 0 || j >= lines.length) {
                    continue;
                }
                let line = lines[j];
                /* It could be minified CSS */
                if (line.length > 120 && error.column) {
                    line = line.substring(error.column - 40, error.column);
                }
                error.message += '\n\t' + (j + 1 - zeroLine) + ':    ';
                error.message += j === error.line - 1 ? ' -> ' : '    ';
                error.message += line;
            }
        }
    }
    if (zeroLine > 0) {
        error.message = error.message.replace(/[0-9]+:/, error.line - zeroLine + ':');
    }
    error.message = `uncss/node_modules/css: unable to parse ${error.filename}:\n${error.message}\n`;
    return error;
}

module.exports = {
    isWindows,
    parseUncssrc,
    parseErrorMessage,
    parsePaths,
    readStylesheets
};

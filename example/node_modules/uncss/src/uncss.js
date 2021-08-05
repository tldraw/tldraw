'use strict';

const glob = require('glob'),
    isHTML = require('is-html'),
    isURL = require('is-absolute-url'),
    jsdom = require('./jsdom.js'),
    postcss = require('postcss'),
    uncss = require('./lib.js'),
    utility = require('./utility.js'),
    _ = require('lodash');

/**
 * Get the contents of HTML pages through jsdom.
 * @param  {Array}   files   List of HTML files
 * @param  {Object}  options UnCSS options
 * @return {Array|Promise}
 */
function getHTML(files, options) {
    if (_.isString(files)) {
        files = [files];
    }

    files = _.flatten(files.map((file) => {
        if (!isURL(file) && !isHTML(file)) {
            return glob.sync(file);
        }
        return file;
    }));

    if (!files.length) {
        return Promise.reject(new Error('UnCSS: no HTML files found'));
    }

    // Save files for later reference.
    options.files = files;
    return Promise.all(files.map((file) => jsdom.fromSource(file, options)));
}

/**
 * Get the contents of CSS files.
 * @param  {Array}   files   List of HTML files
 * @param  {Object}  options UnCSS options
 * @param  {Array}   pages   Pages opened by jsdom
 * @return {Promise}
 */
function getStylesheets(files, options, pages) {
    if (options.stylesheets && options.stylesheets.length) {
        /* Simulate the behavior below */
        return Promise.resolve([files, options, pages, [options.stylesheets]]);
    }
    /* Extract the stylesheets from the HTML */
    return Promise.all(pages.map((page) => jsdom.getStylesheets(page.window, options)))
        .then((stylesheets) => [files, options, pages, stylesheets]);
}

/**
 * Get the contents of CSS files.
 * @param  {Array}   files       List of HTML files
 * @param  {Object}  options     UnCSS options
 * @param  {Array}   pages       Pages opened by jsdom
 * @param  {Array}   stylesheets List of CSS files
 * @return {Array}
 */
function getCSS([files, options, pages, stylesheets]) {
    /* Ignore specified stylesheets */
    if (options.ignoreSheets.length) {
        stylesheets = stylesheets
        .map((arr) => {
            return arr.filter((sheet) => {
                return _.every(options.ignoreSheets, (ignore) => {
                    if (_.isRegExp(ignore)) {
                        return !ignore.test(sheet);
                    }
                    return sheet !== ignore;
                });
            });
        });
    }

    if (_.flatten(stylesheets).length) {
        /* Only run this if we found links to stylesheets (there may be none...)
         *  files       = ['some_file.html', 'some_other_file.html']
         *  stylesheets = [['relative_css_path.css', ...],
         *                 ['maybe_a_duplicate.css', ...]]
         * We need to - make the stylesheets' paths relative to the HTML files,
         *            - flatten the array,
         *            - remove duplicates
         */
        stylesheets =
            _.chain(stylesheets)
                .map((sheets, i) => utility.parsePaths(files[i], sheets, options))
                .flatten()
                .uniq()
                .value();
    } else {
        /* Reset the array if we didn't find any link tags */
        stylesheets = [];
    }
    return Promise.all([options, pages, utility.readStylesheets(stylesheets, options.banner)]);
}

/**
 * Do the actual work
 * @param  {Array}   files       List of HTML files
 * @param  {Object}  options     UnCSS options
 * @param  {Array}   pages       Pages opened by jsdom
 * @param  {Array}   stylesheets List of CSS files
 * @return {Promise}
 */
function processWithTextApi([options, pages, stylesheets]) {
    /* If we specified a raw string of CSS, add it to the stylesheets array */
    if (options.raw) {
        if (_.isString(options.raw)) {
            stylesheets.push(options.raw);
        } else {
            throw new Error('UnCSS: options.raw - expected a string');
        }
    }

    /* At this point, there isn't any point in running the rest of the task if:
     * - We didn't specify any stylesheet links in the options object
     * - We couldn't find any stylesheet links in the HTML itself
     * - We weren't passed a string of raw CSS in addition to, or to replace
     *     either of the above
     */
    if (!_.flatten(stylesheets).length) {
        throw new Error('UnCSS: no stylesheets found');
    }

    /* OK, so we have some CSS to work with!
     * Three steps:
     * - Parse the CSS
     * - Remove the unused rules
     * - Return the optimized CSS as a string
     */
    const cssStr = stylesheets.join(' \n');
    let pcss,
        report;

    try {
        pcss = postcss.parse(cssStr);
    } catch (err) {
        /* Try and construct a helpful error message */
        throw utility.parseErrorMessage(err, cssStr);
    }
    return uncss(pages, pcss, options.ignore).then(([css, rep]) => {
        let newCssStr = '';
        postcss.stringify(css, (result) => {
            newCssStr += result;
        });

        if (options.report) {
            report = {
                original: cssStr,
                selectors: rep
            };
        }
        return [newCssStr, report];
    });
}

/**
 * Main exposed function.
 * Here we check the options and callback, then run the files through jsdom.
 * @param  {Array}    files     Array of filenames
 * @param  {Object}   [options] options
 * @param  {Function} callback(Error, String, Object)
 */
function init(files, options, callback) {

    if (_.isFunction(options)) {
        /* There were no options, this argument is actually the callback */
        callback = options;
        options = {};
    } else if (!_.isFunction(callback)) {
        throw new TypeError('UnCSS: expected a callback');
    }

    /* Try and read options from the specified uncssrc file */
    if (options.uncssrc) {
        try {
            /* Manually-specified options take precedence over uncssrc options */
            options = _.merge(utility.parseUncssrc(options.uncssrc), options);
        } catch (err) {
            if (err instanceof SyntaxError) {
                callback(new SyntaxError('UnCSS: uncssrc file is invalid JSON.'));
                return;
            }
            callback(err);
            return;
        }
    }

    /* Assign default values to options, unless specified */
    options = _.merge({
        banner: true,
        csspath: '',
        html: files,
        htmlRoot: null,
        ignore: [],
        ignoreSheets: [],
        inject: null,
        jsdom: jsdom.defaultOptions(),
        media: [],
        raw: null,
        report: false,
        stylesheets: null,
        timeout: 0,
        uncssrc: null,
        userAgent: 'uncss'
    }, options);

    process(options).then(([css, report]) => callback(null, css, report), callback);
}

function processAsPostCss(options, pages) {
    return uncss(pages, options.rawPostCss, options.ignore);
}

function process(opts) {
    return getHTML(opts.html, opts).then((pages) => {
        function cleanup (result) {
            pages.forEach((page) => page.window.close());
            return result;
        }

        if (opts.usePostCssInternal) {
            return processAsPostCss(opts, pages)
                .then(cleanup);
        }

        return getStylesheets(opts.files, opts, pages)
            .then(getCSS)
            .then(processWithTextApi)
            .then(cleanup);
    });
}

const postcssPlugin = postcss.plugin('uncss', (opts) => {
    let options = _.merge({
        usePostCssInternal: true,
        // Ignore stylesheets in the HTML files; only use those from the stream
        ignoreSheets: [/\s*/],
        html: [],
        ignore: [],
        jsdom: jsdom.defaultOptions()
    }, opts);

    return function (css, result) { // eslint-disable-line no-unused-vars
        options = _.merge(options, {
            // This is used to pass the css object in to processAsPostCSS
            rawPostCss: css
        });

        return process(options);
    };
});

module.exports = init;
module.exports.postcssPlugin = postcssPlugin;

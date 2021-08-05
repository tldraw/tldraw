"use strict";
/* eslint-env browser, es6, node */

import {
    defaults,
    map_from_object,
    map_to_object,
    HOP,
} from "./utils/index.js";
import { AST_Toplevel, AST_Node } from "./ast.js";
import { parse } from "./parse.js";
import { OutputStream } from "./output.js";
import { Compressor } from "./compress/index.js";
import { base54 } from "./scope.js";
import { SourceMap } from "./sourcemap.js";
import {
    mangle_properties,
    reserve_quoted_keys,
} from "./propmangle.js";

var to_ascii = typeof atob == "undefined" ? function(b64) {
    return Buffer.from(b64, "base64").toString();
} : atob;
var to_base64 = typeof btoa == "undefined" ? function(str) {
    return Buffer.from(str).toString("base64");
} : btoa;

function read_source_map(code) {
    var match = /(?:^|[^.])\/\/# sourceMappingURL=data:application\/json(;[\w=-]*)?;base64,([+/0-9A-Za-z]*=*)\s*$/.exec(code);
    if (!match) {
        console.warn("inline source map not found");
        return null;
    }
    return to_ascii(match[2]);
}

function set_shorthand(name, options, keys) {
    if (options[name]) {
        keys.forEach(function(key) {
            if (options[key]) {
                if (typeof options[key] != "object") options[key] = {};
                if (!(name in options[key])) options[key][name] = options[name];
            }
        });
    }
}

function init_cache(cache) {
    if (!cache) return;
    if (!("props" in cache)) {
        cache.props = new Map();
    } else if (!(cache.props instanceof Map)) {
        cache.props = map_from_object(cache.props);
    }
}

function cache_to_json(cache) {
    return {
        props: map_to_object(cache.props)
    };
}

async function minify(files, options) {
    options = defaults(options, {
        compress: {},
        ecma: undefined,
        enclose: false,
        ie8: false,
        keep_classnames: undefined,
        keep_fnames: false,
        mangle: {},
        module: false,
        nameCache: null,
        output: null,
        format: null,
        parse: {},
        rename: undefined,
        safari10: false,
        sourceMap: false,
        spidermonkey: false,
        timings: false,
        toplevel: false,
        warnings: false,
        wrap: false,
    }, true);
    var timings = options.timings && {
        start: Date.now()
    };
    if (options.keep_classnames === undefined) {
        options.keep_classnames = options.keep_fnames;
    }
    if (options.rename === undefined) {
        options.rename = options.compress && options.mangle;
    }
    if (options.output && options.format) {
        throw new Error("Please only specify either output or format option, preferrably format.");
    }
    options.format = options.format || options.output || {};
    set_shorthand("ecma", options, [ "parse", "compress", "format" ]);
    set_shorthand("ie8", options, [ "compress", "mangle", "format" ]);
    set_shorthand("keep_classnames", options, [ "compress", "mangle" ]);
    set_shorthand("keep_fnames", options, [ "compress", "mangle" ]);
    set_shorthand("module", options, [ "parse", "compress", "mangle" ]);
    set_shorthand("safari10", options, [ "mangle", "format" ]);
    set_shorthand("toplevel", options, [ "compress", "mangle" ]);
    set_shorthand("warnings", options, [ "compress" ]); // legacy
    var quoted_props;
    if (options.mangle) {
        options.mangle = defaults(options.mangle, {
            cache: options.nameCache && (options.nameCache.vars || {}),
            eval: false,
            ie8: false,
            keep_classnames: false,
            keep_fnames: false,
            module: false,
            properties: false,
            reserved: [],
            safari10: false,
            toplevel: false,
        }, true);
        if (options.mangle.properties) {
            if (typeof options.mangle.properties != "object") {
                options.mangle.properties = {};
            }
            if (options.mangle.properties.keep_quoted) {
                quoted_props = options.mangle.properties.reserved;
                if (!Array.isArray(quoted_props)) quoted_props = [];
                options.mangle.properties.reserved = quoted_props;
            }
            if (options.nameCache && !("cache" in options.mangle.properties)) {
                options.mangle.properties.cache = options.nameCache.props || {};
            }
        }
        init_cache(options.mangle.cache);
        init_cache(options.mangle.properties.cache);
    }
    if (options.sourceMap) {
        options.sourceMap = defaults(options.sourceMap, {
            asObject: false,
            content: null,
            filename: null,
            includeSources: false,
            root: null,
            url: null,
        }, true);
    }
    if (timings) timings.parse = Date.now();
    var toplevel;
    if (files instanceof AST_Toplevel) {
        toplevel = files;
    } else {
        if (typeof files == "string" || (options.parse.spidermonkey && !Array.isArray(files))) {
            files = [ files ];
        }
        options.parse = options.parse || {};
        options.parse.toplevel = null;

        if (options.parse.spidermonkey) {
            options.parse.toplevel = AST_Node.from_mozilla_ast(Object.keys(files).reduce(function(toplevel, name) {
                if (!toplevel) return files[name];
                toplevel.body = toplevel.body.concat(files[name].body);
                return toplevel;
            }, null));
        } else {
            delete options.parse.spidermonkey;

            for (var name in files) if (HOP(files, name)) {
                options.parse.filename = name;
                options.parse.toplevel = parse(files[name], options.parse);
                if (options.sourceMap && options.sourceMap.content == "inline") {
                    if (Object.keys(files).length > 1)
                        throw new Error("inline source map only works with singular input");
                    options.sourceMap.content = read_source_map(files[name]);
                }
            }
        }

        toplevel = options.parse.toplevel;
    }
    if (quoted_props && options.mangle.properties.keep_quoted !== "strict") {
        reserve_quoted_keys(toplevel, quoted_props);
    }
    if (options.wrap) {
        toplevel = toplevel.wrap_commonjs(options.wrap);
    }
    if (options.enclose) {
        toplevel = toplevel.wrap_enclose(options.enclose);
    }
    if (timings) timings.rename = Date.now();
    // disable rename on harmony due to expand_names bug in for-of loops
    // https://github.com/mishoo/UglifyJS2/issues/2794
    if (0 && options.rename) {
        toplevel.figure_out_scope(options.mangle);
        toplevel.expand_names(options.mangle);
    }
    if (timings) timings.compress = Date.now();
    if (options.compress) {
        toplevel = new Compressor(options.compress, {
            mangle_options: options.mangle
        }).compress(toplevel);
    }
    if (timings) timings.scope = Date.now();
    if (options.mangle) toplevel.figure_out_scope(options.mangle);
    if (timings) timings.mangle = Date.now();
    if (options.mangle) {
        base54.reset();
        toplevel.compute_char_frequency(options.mangle);
        toplevel.mangle_names(options.mangle);
    }
    if (timings) timings.properties = Date.now();
    if (options.mangle && options.mangle.properties) {
        toplevel = mangle_properties(toplevel, options.mangle.properties);
    }
    if (timings) timings.format = Date.now();
    var result = {};
    if (options.format.ast) {
        result.ast = toplevel;
    }
    if (options.format.spidermonkey) {
        result.ast = toplevel.to_mozilla_ast();
    }
    if (!HOP(options.format, "code") || options.format.code) {
        if (options.sourceMap) {
            options.format.source_map = await SourceMap({
                file: options.sourceMap.filename,
                orig: options.sourceMap.content,
                root: options.sourceMap.root
            });
            if (options.sourceMap.includeSources) {
                if (files instanceof AST_Toplevel) {
                    throw new Error("original source content unavailable");
                } else for (var name in files) if (HOP(files, name)) {
                    options.format.source_map.get().setSourceContent(name, files[name]);
                }
            }
        }
        delete options.format.ast;
        delete options.format.code;
        delete options.format.spidermonkey;
        var stream = OutputStream(options.format);
        toplevel.print(stream);
        result.code = stream.get();
        if (options.sourceMap) {
            if(options.sourceMap.asObject) {
                result.map = options.format.source_map.get().toJSON();
            } else {
                result.map = options.format.source_map.toString();
            }
            if (options.sourceMap.url == "inline") {
                var sourceMap = typeof result.map === "object" ? JSON.stringify(result.map) : result.map;
                result.code += "\n//# sourceMappingURL=data:application/json;charset=utf-8;base64," + to_base64(sourceMap);
            } else if (options.sourceMap.url) {
                result.code += "\n//# sourceMappingURL=" + options.sourceMap.url;
            }
        }
    }
    if (options.nameCache && options.mangle) {
        if (options.mangle.cache) options.nameCache.vars = cache_to_json(options.mangle.cache);
        if (options.mangle.properties && options.mangle.properties.cache) {
            options.nameCache.props = cache_to_json(options.mangle.properties.cache);
        }
    }
    if (options.format && options.format.source_map) {
        options.format.source_map.destroy();
    }
    if (timings) {
        timings.end = Date.now();
        result.timings = {
            parse: 1e-3 * (timings.rename - timings.parse),
            rename: 1e-3 * (timings.compress - timings.rename),
            compress: 1e-3 * (timings.scope - timings.compress),
            scope: 1e-3 * (timings.mangle - timings.scope),
            mangle: 1e-3 * (timings.properties - timings.mangle),
            properties: 1e-3 * (timings.format - timings.properties),
            format: 1e-3 * (timings.end - timings.format),
            total: 1e-3 * (timings.end - timings.start)
        };
    }
    return result;
}

export {
  minify,
  to_ascii,
};

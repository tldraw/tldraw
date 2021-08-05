#!/usr/bin/env node
const program = require("commander");
const fs = require("fs");
const {
  default: PurgeCSS,
  defaultOptions,
  setOptions,
  standardizeSafelist,
} = require("../lib/purgecss");

async function writeCSSToFile(filePath, css) {
  try {
    await fs.promises.writeFile(filePath, css);
  } catch (err) {
    console.error(err.message);
  }
}

program
  .usage("--css <css...> --content <content...> [options]")
  .option("-con, --content <files...>", "glob of content files")
  .option("-css, --css <files...>", "glob of css files")
  .option("-c, --config <path>", "path to the configuration file")
  .option(
    "-o, --output <path>",
    "file path directory to write purged css files to"
  )
  .option("-font, --font-face", "option to remove unused font-faces")
  .option("-keyframes, --keyframes", "option to remove unused keyframes")
  .option("-rejected, --rejected", "option to output rejected selectors")
  .option(
    "-s, --safelist <list...>",
    "list of classes that should not be removed"
  )
  .option(
    "-b, --blocklist <list...>",
    "list of selectors that should be removed"
  )
  .option(
    "-k, --skippedContentGlobs <list...>",
    "list of glob patterns for folders/files that should not be scanned"
  );

program.parse(process.argv);

const run = async () => {
  // config file is not specified or the content and css are not,
  // PurgeCSS will not run
  if (!program.config && !(program.content && program.css)) {
    program.help();
  }

  // if the config file is present, use it
  // other options specified will override
  let options = defaultOptions;
  if (program.config) {
    options = await setOptions(program.config);
  }
  if (program.content) options.content = program.content;
  if (program.css) options.css = program.css;
  if (program.fontFace) options.fontFace = program.fontFace;
  if (program.keyframes) options.keyframes = program.keyframes;
  if (program.rejected) options.rejected = program.rejected;
  if (program.variables) options.variables = program.variables;
  if (program.safelist) options.safelist = standardizeSafelist(program.safelist);
  if (program.blocklist) options.blocklist = program.blocklist;
  if (program.skippedContentGlobs) options.skippedContentGlobs = program.skippedContentGlobs;

  const purged = await new PurgeCSS().purge(options);
  const output = options.output || program.output;
  // output results in specified directory
  if (output) {
    if (purged.length === 1 && output.endsWith(".css")) {
      await writeCSSToFile(output, purged[0].css);
      return;
    }

    for (const purgedResult of purged) {
      const fileName = purgedResult.file.split("/").pop();
      await writeCSSToFile(`${output}/${fileName}`, purgedResult.css);
    }
  } else {
    console.log(JSON.stringify(purged));
  }
};

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

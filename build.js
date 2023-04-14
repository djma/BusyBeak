const esbuild = require("esbuild");
const dotenv = require("dotenv");
const glob = require("glob");

// Load environment variables from the .env file
const env = dotenv.config().parsed;

// Prepare an object with environment variables to be injected into the code
const envKeys = Object.entries(env).reduce((prev, [key, value]) => {
  prev[`process.env.${key}`] = JSON.stringify(value);
  return prev;
}, {});

// Expand the file paths using glob
const entryPoints = glob.sync("src/*/index.ts*");

esbuild
  .build({
    entryPoints,
    bundle: true,
    outdir: "dist",
    platform: "browser",
    define: envKeys,
  })
  .catch(() => process.exit(1));

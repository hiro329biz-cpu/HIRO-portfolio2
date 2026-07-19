import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["css/style.css"],
    outfile: "css/style.min.css",
    minify: true,
    legalComments: "none"
  }),
  build({
    entryPoints: ["js/main.js"],
    outfile: "js/main.min.js",
    minify: true,
    legalComments: "none"
  })
]);

console.log("Production assets built: css/style.min.css, js/main.min.js");

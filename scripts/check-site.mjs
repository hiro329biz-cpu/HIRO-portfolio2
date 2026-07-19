import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(projectRoot, "index.html");
const cssPath = path.join(projectRoot, "css/style.css");
const jsPath = path.join(projectRoot, "js/main.js");
const sitemapPath = path.join(projectRoot, "sitemap.xml");
const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const javascript = fs.readFileSync(jsPath, "utf8");
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `重複したidがあります: ${duplicateIds.join(", ")}`);

const h1Count = (html.match(/<h1\b/g) || []).length;
assert(h1Count === 1, `h1は1件にしてください（現在${h1Count}件）`);

const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
const imagesWithoutAlt = images.filter((image) => !/\balt="[^"]*"/.test(image));
assert(imagesWithoutAlt.length === 0, `altのない画像が${imagesWithoutAlt.length}件あります`);
const imagesWithoutDimensions = images.filter((image) => !/\bwidth="\d+"/.test(image) || !/\bheight="\d+"/.test(image));
assert(imagesWithoutDimensions.length === 0, `width/heightのない画像が${imagesWithoutDimensions.length}件あります`);

const directReferences = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const responsiveReferences = [...html.matchAll(/\b(?:srcset|imagesrcset)="([^"]+)"/g)]
  .flatMap((match) => match[1].split(","))
  .map((candidate) => candidate.trim().split(/\s+/)[0]);
const localReferences = [...directReferences, ...responsiveReferences]
  .filter((reference) => !/^(?:https?:|#|mailto:|tel:)/.test(reference))
  .map((reference) => reference.split(/[?#]/)[0]);
const missingFiles = [...new Set(localReferences.filter((reference) => !fs.existsSync(path.join(projectRoot, reference))))];
assert(missingFiles.length === 0, `参照先がないファイルがあります: ${missingFiles.join(", ")}`);

for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  try {
    JSON.parse(match[1]);
  } catch (error) {
    errors.push(`JSON-LDを解析できません: ${error.message}`);
  }
}

try {
  new Function(javascript);
} catch (error) {
  errors.push(`JavaScript構文エラー: ${error.message}`);
}

const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
assert(Boolean(canonical), "canonical URLがありません");
if (canonical) assert(sitemap.includes(`<loc>${canonical}</loc>`), "canonical URLとsitemap.xmlのURLが一致していません");

const documentTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
const metaDescription = html.match(/<meta name="description" content="([^"]+)"/i)?.[1]?.trim();
const openGraphImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
assert(Boolean(documentTitle), "titleがありません");
assert(Boolean(metaDescription), "meta descriptionがありません");
assert(Boolean(openGraphImage), "OGP画像がありません");
assert(/<html\s+lang="ja"/i.test(html), "htmlのlang属性をjaにしてください");
if (canonical) assert(canonical.startsWith("https://"), "canonical URLはHTTPSにしてください");
if (openGraphImage) assert(openGraphImage.startsWith("https://"), "OGP画像URLは絶対URLにしてください");

const strippedCss = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
const openingBraces = (strippedCss.match(/\{/g) || []).length;
const closingBraces = (strippedCss.match(/\}/g) || []).length;
assert(openingBraces === closingBraces, `CSSの波括弧が対応していません（${openingBraces}/${closingBraces}）`);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Static checks passed: ${images.length} images, ${localReferences.length} local references, ${ids.length} ids.`);
}

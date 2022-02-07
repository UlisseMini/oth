import { unified } from "unified";
import { read, write } from "to-vfile";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeDocument from "rehype-document";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkWikiLink from "remark-wiki-link";
import klaw from "klaw";
import path from "path";
import fs from "fs-extra";
import frontmatter from "front-matter";

main();

async function main() {
  for await (const file of klaw("./notes")) {
    if (path.extname(file.path) === ".md") {
      const sourceVFile = await read(file.path);
      const htmlVFile = await compile(sourceVFile);

      htmlVFile.dirname = notesToOutPath(sourceVFile.dirname);
      htmlVFile.extname = ".html";
      htmlVFile.stem = pageResolver(sourceVFile.stem);

      await fs.mkdir(htmlVFile.dirname, { recursive: true });
      await write(htmlVFile);
      console.log(`wrote ${htmlVFile.path}`);
    } else {
      if (!file.stats.isDirectory() && !file.path.includes(".obsidian")) {
        await copy(file.path, notesToOutPath(file.path));
      }
    }
  }

  await copy("node_modules/katex/dist/katex.min.css", "out/katex.min.css");
  await copy("node_modules/katex/dist/fonts", "out/fonts");
  await copy(
    "node_modules/highlight.js/styles/default.css",
    "out/highlight.css"
  );
}

async function compile(file) {
  const fm = frontmatter(file.value.toString());
  file.value = fm.body;

  // Relative path to root, needed to handle the root being user.github.io/project
  const depth = file.path.split("/").reverse().lastIndexOf("notes");
  const root = "../".repeat(depth);

  return await unified()
    .use(remarkParse)
    .use(remarkWikiLink, {
      // This pkg is yucky, the defaults are wierd. it's only ~30 lines though, the parsing
      // code is done here: https://github.com/landakram/micromark-extension-wiki-link
      aliasDivider: "|",
      pageResolver: (name) => [pageResolver(name)],
      hrefTemplate: (permalink) => permalink,
    })
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeKatex)
    .use(rehypeDocument, {
      title: fm.attributes.title || file.stem,
      // Could fetch @latest css, but I'm afraid of breaking changes (eg. class name changes)
      css: [
        root + "styles.css",
        root + "highlight.css",
        root + "katex.min.css",
      ],
    })
    .use(rehypeStringify)
    .process(file);
}

// convert "Hello World.md" -> hello-world.md
const pageResolver = (name) => name.toLowerCase().replace(/ /g, "-");

// convert a/b/notes/c/d -> a/b/out/c/d
const notesToOutPath = (p) => path.join("out", path.relative("notes", p));

async function copy(src, dst) {
  await fs.copy(src, dst);
  console.log(`copied ${src} -> ${dst}`);
}

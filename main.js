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

main();

async function main() {
  for await (const file of klaw("./notes")) {
    if (path.extname(file.path) === ".md") {
      const sourceVFile = await read(file.path);
      const htmlVFile = await compile(sourceVFile);

      htmlVFile.dirname = "./out";
      htmlVFile.extname = ".html";
      htmlVFile.stem = pageResolver(sourceVFile.stem);

      console.log(`wrote ${htmlVFile.path}`);
      await write(htmlVFile);
    }
  }
}

const pageResolver = (name) => name.toLowerCase().replace(/ /g, "-");

async function compile(file) {
  return await unified()
    .use(remarkParse)
    .use(remarkWikiLink, {
      // This pkg is yucky, the defaults are wierd. it's only ~30 lines though, the parsing
      // code is done here: https://github.com/landakram/micromark-extension-wiki-link
      pageResolver: (name) => [pageResolver(name)],
      hrefTemplate: (permalink) => permalink,
    })
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeKatex)
    .use(rehypeDocument, {
      title: file.stem,
      // Could fetch @latest css, but I'm afraid of breaking changes (eg. class name changes)
      css: [
        "https://cdn.jsdelivr.net/npm/katex@0.15.0/dist/katex.min.css",
        "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.4.0/build/styles/default.min.css",
        "/styles.css",
      ],
    })
    .use(rehypeStringify)
    .process(file);
}

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
import { is } from "unist-util-is";
import { reporter } from "vfile-reporter";

main();

async function main() {
  for await (const file of klaw("./notes")) {
    if (path.extname(file.path) === ".md") {
      const markdownVFile = await read(file.path);
      await compileAndWrite(markdownVFile);
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

async function compileAndWrite(markdownVFile) {
  const htmlVFile = await compile(markdownVFile);

  htmlVFile.dirname = notesToOutPath(markdownVFile.dirname);
  htmlVFile.extname = ".html";
  htmlVFile.stem = pageResolver(markdownVFile.stem);

  await fs.mkdir(htmlVFile.dirname, { recursive: true });
  await write(htmlVFile);
  console.log(`wrote ${htmlVFile.path}`);
}

async function compile(file) {
  const fm = frontmatter(file.value.toString());
  file.value = fm.body;

  // temporary hack, see https://github.com/UlisseMini/oth/issues/11
  file.value = file.value.replace(/foo/g);

  // Relative path to root, needed to handle the root being user.github.io/project
  // notes/a/b.md => depth = 1, notes/a.md => depth = 0
  const depth = file.path.split("/").reverse().lastIndexOf("notes") - 1;
  const root = "../".repeat(depth);

  return await unified()
    .use(remarkParse)
    .use(remarkRunCode) // NOTE: it's important this comes first
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
      css: [
        root + "styles.css",
        root + "highlight.css",
        root + "katex.min.css",
      ],
    })
    .use(rehypeStringify)
    .process(file)
    .then((file) => {
      if (file.messages.length > 0)
        console.error(reporter(file, { quiet: true }));
      return file;
    });
}

function remarkRunCode() {
  return async (tree, file) => {
    // No recursion needed since code blocks are always at the top level
    for (const index in tree.children) {
      const node = tree.children[index];
      if (is(node, "code") && node.meta === "run") {
        try {
          const module = await importInline(node.value);
          const generatedTree = unified()
            .use(remarkParse)
            .parse(module.markdown);
          tree.children.splice(index, 1, ...generatedTree.children);
        } catch (e) {
          const message = file.message(`In code block: ${e}`, node);
          message.fatal = true;
        }
      }
    }
  };
}

let cacheBusts = 0;
async function importInline(code) {
  // could use ?q cache busting, but then I have to worry about race conditions
  let file = `./.tmp${++cacheBusts}.js`;
  let module;
  try {
    await fs.writeFile(file, code);
    module = await import(file);
  } finally {
    await fs.remove(file);
  }
  return module;
}

// convert "Hello World" -> hello-world
const pageResolver = (name) => name.toLowerCase().replace(/ /g, "-");

// convert a/b/notes/c/d -> a/b/out/c/d
const notesToOutPath = (p) => path.join("out", path.relative("notes", p));

async function copy(src, dst) {
  await fs.copy(src, dst);
  console.log(`copied ${src} -> ${dst}`);
}

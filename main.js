import frontmatter from "front-matter";
import fs from "fs-extra";
import klaw from "klaw";
import path from "path";
import rehypeDocument from "rehype-document";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkWikiLink from "remark-wiki-link-plus";
import rehypeRaw from "rehype-raw";
import { read, write } from "to-vfile";
import { unified } from "unified";
import { is } from "unist-util-is";
import { reporter } from "vfile-reporter";
import { visit } from "unist-util-visit";

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

  // Relative path to root, needed to handle the root being user.github.io/project
  // notes/a/b.md => depth = 1, notes/a.md => depth = 0
  const depth = file.path.split("/").reverse().lastIndexOf("notes") - 1;
  const root = "../".repeat(depth);

  return await unified()
    .use(remarkParse)
    .use(remarkRunCode) // NOTE: it's important this comes first
    .use(remarkWikiLink, {
      markdownFolder: "notes",
      hrefTemplate: (permalink) => permalink,
    })
    .use(remarkMath)
    .use(remarkNoInlineDoubleDollar)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
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

// See https://github.com/UlisseMini/oth/issues/13
function remarkNoInlineDoubleDollar() {
  return (tree, file) => {
    visit(tree, "inlineMath", (node) => {
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      const lexeme = file.value.slice(start, end);

      if (lexeme.startsWith("$$")) {
        file.message(
          "$$math$$ renders inline in remark-math but display in obsidian. Did you forget newlines?",
          node
        );
      }
    });
  };
}

// convert "Hello World" -> hello-world
const pageResolver = (name) => name.toLowerCase().replace(/ /g, "-");

// convert a/b/notes/c/d -> a/b/out/c/d
const notesToOutPath = (p) => path.join("out", path.relative("notes", p));

async function copy(src, dst) {
  await fs.copy(src, dst);
  console.log(`copied ${src} -> ${dst}`);
}

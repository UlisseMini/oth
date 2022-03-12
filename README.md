# oth (Obsidian To HTML)

This is a template for publishing obsidian notes as a static site.
The goal of the project is to stay minimal, but have enough features to showcase how you do things in the [unified](https://unifiedjs.com/) ecosystem.

:warning: Wikilinks to subdirs must be `[[subdir/note]]` NOT `[[note]]` as obsidian does by default. Change obsidian's "New link format" in Files & Links to "Relative path to file" to avoid issues. (Or better: use flat files like god intended)

### Features

See [here](https://ulissemini.github.io/oth/) for a demo

- [x] Works without client side javascript
- [x] Code highlighting
- [x] Math support
- [x] [[wikilinks]] support
- [x] Runs js code in \`\`\`js run blocks and splices in the exported markdown

### Setup

1. [Create a repo using the template](https://github.com/UlisseMini/oth/generate)
2. Go to Settings -> Pages and set "deploy branch" to gh-pages and path to be the root `/`
3. Profit

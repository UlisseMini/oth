---
# notes support optional frontmatter
title: "Hello!"
---

## Hello!

This is an obsidian note, it can link to other notes via wikilinks (see: [[Configuration is bloat]] and [[It handles subdirectories]])

We can do code highlighting

```python
import foo from bar
def baz():
	bar.qux()
```

We can handle inline $2+2$ and display math

$$
\sin(x) = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \dots = \sum_{k=0}^\infty \frac{x^{2k + 1}}{(2k+1)!}
$$

Be careful! inline double dollars `$$foo$$` render as inline, see [issue 13](https://github.com/UlisseMini/oth/issues/13). If you forget you'll receive a warning $$2 + 2$$

Images work fine
![[Pasted image 20221103224759.png]]

Javascript code annotated with `run` will be executed, and it's results pasted in. This

    ```js run
    import fs from "fs-extra";

    const files = await fs.readdir(".");
    const listBody = files.map(f => `<li>${f}</li>`).join("\n");
    export const markdown = `Files:\n<ul>${listBody}</ul>`;
    ```

Becomes this

```js run
import fs from "fs-extra";

const files = await fs.readdir(".");
const listBody = files.map((f) => `<li>${f}</li>`).join("\n");
export const markdown = `Files:\n<ul>${listBody}</ul>`;
```

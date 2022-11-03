
This might seem trivial, but having the stylesheet be `/styles.css` doesn't work on github pages, since it tries to fetch `username.github.io/styles.css` instead of `username.github.io/repo/styles.css`.

I solve this by making all stylesheet links relative. Since I don't want the user to have to configure their repo root (I could probably get it from a variable in actions, but that's cursed)

Links also work, see [[./Another]] or return to [[../Index|The homepage]]
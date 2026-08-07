# Road to Doomsday

A watch tracker for the road to *Avengers: Doomsday*. Countdown, progress gauge,
73 titles across three routes, release or in-universe order, progress saved on
the visitor's own device.

Plain HTML, CSS and JavaScript. No build step, no framework, no backend.

## Files

| File | What it is |
| --- | --- |
| `index.html` | the page |
| `styles.css` | the whole design system, tokens at the top |
| `data.js` | **the catalogue — this is the file you'll actually edit** |
| `app.js` | tracker logic |
| `sw.js` | offline cache (https only) |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | add-to-home-screen |
| `check.mjs` | validates the catalogue |
| `build_single.py` | bundles everything into `dist/` |
| `make_icons.py` | regenerates the icons |

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight off disk works too, but the service worker and
add-to-home-screen only kick in over https.

## Host it

It's a folder of static files, so anything that serves static files will do.

**GitHub Pages** — free, and the URL is permanent.

```sh
git init && git add . && git commit -m "Road to Doomsday"
gh repo create doomsday-tracker --public --source=. --push
```

Then Settings → Pages → Source: `Deploy from a branch`, branch `main`, folder
`/ (root)`. Live at `https://<you>.github.io/doomsday-tracker/` in about a minute.

**Netlify** — drag this folder onto <https://app.netlify.com/drop>. That's it.

**Vercel** — `npx vercel --prod` from this directory.

**Cloudflare Pages** — connect the repo, leave the build command empty, set the
output directory to `/`.

All four give you https, which the offline cache and phone install need.

### A custom domain

Point an `A`/`CNAME` record at your host, add the domain in its dashboard, and
put the bare domain in a `CNAME` file if you're on GitHub Pages.

## Edit the list

Everything lives in [`data.js`](data.js). Add a title:

```js
{ id: 'some-slug', title: 'Some Film', year: 2027, kind: 'film', mins: 120,
  phase: 'p6', path: 'core', chrono: 2027, earth: '616',
  note: 'One line on why it matters.' },
```

- **`id`** is what a visitor's saved progress points at. Renaming an id wipes
  that row for everyone who already ticked it. Add new ids; never recycle old ones.
- **`path`** decides which routes it shows up in: `core` (Essentials), `full`
  (Full MCU), `multiverse` (Fox era), `street` (Netflix).
- **`chrono`** is the in-universe sort key. Decimals are for ordering within a
  year — `2016.1` sits just after `2016`.
- **`upcoming: true`** adds the "not out yet" tag.

Change the release date at the top of the same file:

```js
const RELEASE = {
  title: 'Avengers: Doomsday',
  date: '2026-12-18T00:00:00',
  dateLabel: 'December 18, 2026',
};
```

Then check your work:

```sh
node check.mjs
```

It catches duplicate ids, unknown phases, paths that no route includes, missing
runtimes, and an unparseable release date.

**After any edit to `data.js`, `app.js` or `styles.css`, bump `CACHE` in
`sw.js`** (`rtd-v1` → `rtd-v2`). Otherwise people who already installed the site
keep the old copy.

## Change the look

The palette and type are custom properties at the top of `styles.css`, declared
three times: once as the default dark ground, once under
`@media (prefers-color-scheme: light)`, and once under `:root[data-theme="…"]`
for an explicit toggle. Edit all three or the themes drift apart.

## How progress is stored

`localStorage`, on the visitor's device. No accounts, no database, nothing
leaves the browser — which also means progress doesn't follow anyone between
devices. That's what **Share progress** is for: it packs the ticks into one bit
per title, base64s it, and hangs it off the URL as `#s=…`. Opening that link on
a fresh device adopts the progress silently; opening it on a device that already
has ticks asks first.

The share code is positional against the order of `CATALOGUE`. Appending new
entries at the end is safe. Reordering the array invalidates every link already
in the wild.

## Bundle it into one file

```sh
python3 build_single.py
```

Writes `dist/index.html` (a complete standalone page — mail it, open it from a
USB stick) and `dist/fragment.html` (for hosts that supply their own document
shell).

## Accuracy

Runtimes are approximate and include credits. Release dates and casting for
unreleased titles follow the studio's latest public announcements, and those
move — check `data.js` against the current schedule before you launch.

Fan-made. Not affiliated with Marvel Studios or The Walt Disney Company.

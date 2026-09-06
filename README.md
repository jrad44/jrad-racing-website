# JRAD Racing website

Everything here is one plain HTML file plus an `assets` folder — no build
step, no framework, no database. You can open `index.html` directly in a
browser to preview it right now by double-clicking it.

## What's in this folder

```
index.html          ← homepage (hero, live player, garage, crew, about)
index-hero-b.html   ← a second hero design to compare against index.html —
                       preview it, pick a favorite, then delete this file
schedule.html        ← full weekly schedule page
trophy.html          ← results / achievements page
gear.html            ← rig + affiliate gear list
sponsors.html        ← partner logos + a "become a sponsor" contact form
assets/               ← every image the site uses, plus the shared site.css
brand-kit/            ← extra logo files (black, white, boxed lockup, favicon)
README.md             ← this file
```

All five real pages share one stylesheet (`assets/site.css`) and the same
header/footer markup pasted into each file. That's the tradeoff of a
no-build-tools site: colors and fonts only need editing in one place
(`site.css`), but if you ever change the nav links or footer, do it in
each `.html` file — there are 5 copies (index, schedule, trophy, gear,
sponsors).

## Hosting it for close to free

Since it's static HTML, you don't need real hosting infrastructure — just a
place to serve files. Two good free options that both work well with a
Porkbun domain:

### Option A — Cloudflare Pages (recommended)
Free, fast, handles SSL automatically, and connects straight to your domain.

1. Create a free account at [pages.cloudflare.com](https://pages.cloudflare.com).
2. Choose **"Upload assets"** (not the Git option, unless you want to put this
   in a GitHub repo later) and drag in this whole folder.
3. Cloudflare gives you a `*.pages.dev` URL immediately — check the site
   works there first.
4. In Cloudflare Pages → your project → **Custom domains**, add
   `jradracing.com` and `www.jradracing.com`.
5. In Porkbun, go to your domain → **DNS records**, and add the CNAME
   records Cloudflare shows you (Cloudflare walks you through this step
   automatically once you add the custom domain).
6. Come back and update the Twitch embed's `parent=` values in `index.html`
   if you test on the `.pages.dev` link before the domain is live (see
   below).

Total cost: **$0/month**, on top of whatever you already pay Porkbun yearly
for the domain.

### Option B — GitHub Pages
Also free. Slightly more setup (you need a GitHub account and a repo), but
it's a good option if you'd like version history of your edits over time.
Push this folder to a repo, turn on Pages in the repo settings, then point
your Porkbun domain at it the same way as above (Porkbun → DNS → add the
records GitHub's Pages docs ask for).

## Comparing the two hero designs

Open `index.html` and `index-hero-b.html` side by side in your browser
(just double-click both). Variant B has a yellow banner across the top so
you don't confuse it with the real homepage. Whichever you like better:

- **Keep Variant A (index.html as-is):** delete `index-hero-b.html`, done.
- **Switch to Variant B:** open `index-hero-b.html`, copy everything from
  `<section class="heroB">` down to the matching `</section>` (right before
  `<!-- ================= GARAGE ================= -->`), paste it into
  `index.html` in place of the current `<section class="hero" ...>...</section>`
  block, then delete `index-hero-b.html`.

## Setting up the "Become a Sponsor" form

`sponsors.html` has a contact form, but a static site has no server to
receive it — it needs a free form backend:

1. Go to [formspree.io](https://formspree.io) and make a free account.
2. Create a new form. It'll give you a URL like
   `https://formspree.io/f/abcd1234`.
3. Open `sponsors.html`, find `YOUR_FORM_ID` (it's in the `<form action=...>`
   line), and replace it with your real form ID.
4. Also update the fallback email link right below the submit button —
   it currently says `jrad@jradracing.com`, swap in your real address.

Until you do that, the form shows a friendly "not connected yet" message
instead of silently losing messages.

## Logging results on the Trophy Room page

`trophy.html` ships with clearly-labeled **sample** cards and empty
results tables — nothing invented. As you actually race:
- Copy a `.trophy-card` block to add a one-off achievement (a win, a
  podium), then delete the two `is-sample` example cards.
- Add a `<tr>` to the results tables to log a race — date, track,
  finish, whatever columns matter to you.

## The one thing that WILL break if you skip it

The live player embed uses Twitch's official player, which only works on
domains you tell it about in advance. In `index.html`, find this block:

```html
<iframe
  src="https://player.twitch.tv/?channel=jradracing&parent=jradracing.com&parent=www.jradracing.com&muted=true"
  allowfullscreen>
</iframe>
```

If you preview the site somewhere else first (like a `yoursite.pages.dev`
link, or `localhost`), add another `&parent=` for that domain too, e.g.
`&parent=jradracing.pages.dev`. Otherwise the player area will show a blank
error instead of your stream.

## Editing the site yourself later

Everything a non-developer would want to change lives in `index.html` in
plain text — open it in any text editor (Notepad, TextEdit, VS Code,
whatever). A few spots are marked `<!-- EDIT ME -->` in the code:

- **This week's schedule** — search for `id="schedule"`. Each race night is
  one `<tr>...</tr>` row in the table. Copy a row, change the day/session/
  time/status text, and paste it back in. Status pill colors:
  - `status-race` (yellow) — you're racing
  - `status-tbd` (green) — tentative
  - `status-off` (grey) — off

- **Bio text** — search for `id="about"` and edit the two `<p>` paragraphs.

- **Adding a new car / livery photo** — drop the image file into `assets/`,
  then either replace one of the existing `<img src="assets/...">` paths in
  the Garage section, or copy one of the `<img>` tags in `.thumb-row` to add
  another thumbnail.

- **Social links** — every link in the header, footer, and "Join the crew"
  section is a plain `<a href="...">`. Update the URL if a handle ever
  changes.

- **Partners section** — once you land a sponsor, replace the text in the
  `id="partners"` section with their logo (drop the file in `assets/`,
  same pattern as the iRacing logo already there).

You never need to touch the `<style>` block at the top unless you want to
change colors/fonts — the two brand colors are defined once near the top:

```css
--yellow: #d9ff3f;   /* MX-5 Cup accent */
--green: #3ecb6d;    /* GT3 accent */
```

## If you outgrow "edit the HTML by hand"

Down the road, if you want to update the schedule from your phone without
opening a text editor, the easiest upgrade path is a free headless CMS like
**Decap CMS** bolted onto the same Cloudflare Pages + GitHub setup — it adds
a simple login-and-edit web form on top of these same files. Worth doing
once you're updating the site often; not necessary to start.

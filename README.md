# jpdb+

A Tampermonkey userscript that puts a `···` menu on [jpdb.io](https://jpdb.io) and pulls
[Kanji Koohii](https://kanji.koohii.com) mnemonics onto kanji pages.

![The ··· menu, with each row labelled](docs/menu.png)

## Install

**Desktop** — with [Tampermonkey](https://www.tampermonkey.net/) or
[Violentmonkey](https://violentmonkey.github.io/) installed, open
[`jpdb-plus.user.js`](https://raw.githubusercontent.com/JasonHiew/jpdb-plus/main/jpdb-plus.user.js)
and accept the install prompt.

**iPhone / iPad** — the free [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)
app (iOS 15.1+) or [wBlock](https://github.com/0xCUB3/wBlock) (free, iOS 15.4+) runs these in
Safari. In wBlock: Settings → Userscripts → add this file by URL, then turn userscripts **on for
jpdb.io** in the toolbar popup — they are per-site. See [below](#on-iphone-and-ipad) for what
Safari changes.

## The menu

Four rows and a story count. Each row cycles **show → hide → hover** on click and remembers the
setting in `localStorage`.

### Meanings

The descriptions on a vocabulary entry: the senses and their example sentences. Hiding them
leaves the headword, the readings and the part of speech, so you can try to produce the meaning
before you look.

![Meanings shown, then hidden](docs/toggle-meanings.png)

### Furigana

Every `rt` annotation on the page — the small reading above precisely the kanji you might not
know yet.

![Furigana shown, then hidden](docs/toggle-furigana.png)

### Meanings (used in)

The English inside the "used in kanji" and "used in vocabulary" lists. A kanji page ends in
hundreds of related words; with the glosses hidden it reads as a list of shapes to recognise
rather than a wall of translations. The Japanese and the readings stay either way.

![Glosses in the used-in lists shown, then hidden](docs/toggle-usedin.png)

### Koohii

Kanji Koohii's stories for the current kanji, inserted under jpdb's own mnemonic section: your
favourites first, then community stories with author, date and star count, starrable without
leaving the page. Cached per kanji for a week; `refresh` refetches. The `−` / `+` row sets how
many community stories to show.

**It needs a Koohii login, which is why there is no screenshot of it here.** Kanji Koohii
answers a logged-out request with a sign-in page and zero stories — the whole page, not just the
favourites — and jpdb+ reads that page through your browser's own cookies. So there is nothing to
configure and no token to paste, but with no Koohii session you get an empty list and only a line
of text saying so. Log in once at kanji.koohii.com in the same browser and the stories appear.

The block tells you which failure you got, because every one of them used to be silent:

- **"returned its sign-in page"** — the request carried no Koohii session. On iPhone this is
  usually Safari blocking cross-site cookies: a request from jpdb.io to kanji.koohii.com is
  third-party, and "Prevent Cross-Site Tracking" is on by default. Signing in again will not fix
  it; turning that setting off will, at the cost of the tracking protection everywhere else.
- **"Could not reach kanji.koohii.com"** — the request never left. Check that the userscript
  manager allows the host the script declares with `@connect`.
- **"No stories came back for this kanji"** — the fetch worked and that kanji genuinely has none.

## Limits

- **It scrapes Koohii's HTML.** There is no API for those stories, so the parse depends on their
  current markup and will break if they redesign. Bug reports with the kanji and a screenshot are
  the fastest fix.
- **`hover` does nothing on touch.** There is no pointer to hover with, so on a phone use `hide`.

## On iPhone and iPad

The script runs unchanged in Safari through the Userscripts or wBlock app. The `···` opens on
tap and closes when you tap elsewhere; `hover` still does nothing, since there is no pointer to
hover with. A native Safari Web Extension with a toolbar popup would be a better home for the
settings; it is not built yet.

## Notes

Not affiliated with jpdb.io or Kanji Koohii. It only changes what your own browser renders and
only makes requests you would have made by opening those pages yourself.

MIT licensed. No build step: one file, no dependencies.

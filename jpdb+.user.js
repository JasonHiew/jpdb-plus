// ==UserScript==
// @name         jpdb+
// @namespace    https://github.com/JasonHiew/jpdb-plus
// @version      1.14.0
// @description  Adds a ··· menu to jpdb.io with show/hide/hover toggles for meanings, furigana and Koohii mnemonics.
// @author       Jason Hiew
// @homepageURL  https://github.com/JasonHiew/jpdb-plus
// @supportURL   https://github.com/JasonHiew/jpdb-plus/issues
// @downloadURL  https://raw.githubusercontent.com/JasonHiew/jpdb-plus/main/jpdb+.user.js
// @updateURL    https://raw.githubusercontent.com/JasonHiew/jpdb-plus/main/jpdb+.user.js
// @match        https://jpdb.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jpdb.io
// @grant        GM_xmlhttpRequest
// @connect      kanji.koohii.com
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {

  var modes = ['show', 'hide', 'hover'];
  var mi = modes.indexOf(localStorage.getItem('jpdb-meaning-mode') || 'show'); if (mi === -1) mi = 0;
  var ui = modes.indexOf(localStorage.getItem('jpdb-usedin-mode') || 'show'); if (ui === -1) ui = 0;
  var fi = modes.indexOf(localStorage.getItem('jpdb-furigana-mode') || 'show'); if (fi === -1) fi = 0;
  var koohiiOn    = localStorage.getItem('jpdb-koohii-enabled') !== 'false';
  var koohiiCount = Math.max(1, parseInt(localStorage.getItem('jpdb-koohii-count') || '5', 10));

  var css = document.createElement('style');
  document.head.appendChild(css);

  function buildCSS() {
    var m = modes[mi], u = modes[ui], f = modes[fi], parts = [];
    if (m === 'hide')
      parts.push('.subsection>.description{visibility:hidden}');
    else if (m === 'hover')
      parts.push('.subsection>.description{visibility:hidden}.subsection:hover>.description{visibility:visible}');
    if (u === 'hide')
      parts.push('.used-in .en,.used-in .description,.subsection>div .description{visibility:hidden}');
    else if (u === 'hover')
      parts.push(
        '.used-in .en,.used-in .description,.subsection>div .description{visibility:hidden}' +
        '.used-in:hover .en,.used-in:hover .description,.subsection>div:hover .description{visibility:visible}'
      );
    if (f === 'hide')
      parts.push('rt{visibility:hidden}');
    else if (f === 'hover')
      parts.push('rt{visibility:hidden}ruby:hover rt{visibility:visible}');
    css.textContent = parts.join('');
  }

  buildCSS();

  // ── Navbar ··· menu ──────────────────────────────────────────────────────

  var reloadKoohii = null; // set later if on a kanji page

  var nav = document.querySelector('.nav');
  if (nav) {
    var navStyle = getComputedStyle(nav);
    // Walk up to find a solid (non-transparent) background colour
    var bg = (function () {
      var node = nav;
      while (node) {
        var c = getComputedStyle(node).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        node = node.parentElement;
      }
      return '#1a1a1a';
    })();
    var fg = navStyle.color;

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    var trigger = document.createElement('a');
    trigger.textContent = '···';
    trigger.className = 'nav-item';
    trigger.style.cssText = 'cursor:default;user-select:none;letter-spacing:3px;';
    wrapper.appendChild(trigger);

    var panel = document.createElement('div');
    panel.style.cssText = [
      'display:none', 'position:absolute', 'left:0', 'top:100%',
      'background:' + bg, 'color:' + fg,
      'border:1px solid rgba(128,128,128,0.3)', 'border-radius:6px',
      'padding:6px', 'min-width:160px', 'z-index:9999',
      'box-shadow:0 6px 16px rgba(0,0,0,0.5)', 'flex-direction:column', 'gap:4px',
    ].join(';');

    // Delay hide so the cursor can move from trigger into the panel without it closing
    var _leaveTimer = null;
    wrapper.addEventListener('mouseenter', function () {
      clearTimeout(_leaveTimer);
      panel.style.display = 'flex';
    });
    wrapper.addEventListener('mouseleave', function () {
      _leaveTimer = setTimeout(function () { panel.style.display = 'none'; }, 120);
    });

    function makeToggleBtn(label, getIdx, setIdx, key) {
      var btn = document.createElement('button');
      btn.style.cssText = 'background:rgba(128,128,128,0.15);color:inherit;border:1px solid rgba(128,128,128,0.25);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;text-align:left;width:100%;';
      function update() { btn.textContent = label + ': ' + modes[getIdx()]; }
      btn.onclick = function (e) {
        e.stopPropagation();
        setIdx((getIdx() + 1) % 3);
        localStorage.setItem(key, modes[getIdx()]);
        buildCSS();
        update();
      };
      update();
      return btn;
    }

    function makeOnOffBtn(label, getVal, setVal, key) {
      var btn = document.createElement('button');
      btn.style.cssText = 'background:rgba(128,128,128,0.15);color:inherit;border:1px solid rgba(128,128,128,0.25);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;text-align:left;width:100%;';
      function update() { btn.textContent = label + ': ' + (getVal() ? 'on' : 'off'); }
      btn.onclick = function (e) {
        e.stopPropagation();
        setVal(!getVal());
        localStorage.setItem(key, String(getVal()));
        update();
      };
      update();
      return btn;
    }

    panel.appendChild(makeToggleBtn('Meanings', function () { return mi; }, function (v) { mi = v; }, 'jpdb-meaning-mode'));
    panel.appendChild(makeToggleBtn('Meanings (used in)', function () { return ui; }, function (v) { ui = v; }, 'jpdb-usedin-mode'));
    panel.appendChild(makeToggleBtn('Furigana', function () { return fi; }, function (v) { fi = v; }, 'jpdb-furigana-mode'));
    panel.appendChild(makeOnOffBtn('Koohii', function () { return koohiiOn; }, function (v) { koohiiOn = v; }, 'jpdb-koohii-enabled'));

    var countRow = document.createElement('div');
    countRow.style.cssText = 'display:flex;align-items:center;gap:4px;background:rgba(128,128,128,0.15);border:1px solid rgba(128,128,128,0.25);border-radius:4px;padding:2px 4px;font-size:12px;';
    var countLabel = document.createElement('span');
    countLabel.style.cssText = 'flex:1;';
    countLabel.textContent = 'Koohii stories: ' + koohiiCount;
    var btnStyle = 'background:rgba(128,128,128,0.2);border:1px solid rgba(128,128,128,0.3);border-radius:3px;color:inherit;cursor:pointer;font-size:11px;padding:1px 5px;line-height:1.4;';
    var decBtn = document.createElement('button');
    decBtn.textContent = '−';
    decBtn.style.cssText = btnStyle;
    decBtn.onmousedown = function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (koohiiCount > 1) {
        koohiiCount--;
        localStorage.setItem('jpdb-koohii-count', koohiiCount);
        countLabel.textContent = 'Koohii stories: ' + koohiiCount;
        if (reloadKoohii) reloadKoohii();
      }
    };
    var incBtn = document.createElement('button');
    incBtn.textContent = '+';
    incBtn.style.cssText = btnStyle;
    incBtn.onmousedown = function (e) {
      e.stopPropagation();
      e.preventDefault();
      koohiiCount++;
      localStorage.setItem('jpdb-koohii-count', koohiiCount);
      countLabel.textContent = 'Koohii stories: ' + koohiiCount;
      if (reloadKoohii) reloadKoohii();
    };
    countRow.appendChild(countLabel);
    countRow.appendChild(decBtn);
    countRow.appendChild(incBtn);
    panel.appendChild(countRow);
    wrapper.appendChild(panel);

    var learnLink = nav.querySelector('a[href="/learn"]');
    if (learnLink) nav.insertBefore(wrapper, learnLink);
    else nav.appendChild(wrapper);
  }

  // ── Koohii mnemonics (kanji pages only) ──────────────────────────────────

  if (!koohiiOn) return;

  var kanjiMatch = window.location.pathname.match(/^\/kanji\/([^/#]+)/);
  if (!kanjiMatch) return;

  var kanji = decodeURIComponent(kanjiMatch[1]);

  var mnLabel = [...document.querySelectorAll('h6.subsection-label')]
    .find(function (e) { return e.textContent.includes('Mnemonic'); });
  if (!mnLabel) return;

  var mnParent = mnLabel.parentElement;

  var CACHE_KEY = 'jpdb-koohii-' + kanji;
  var STARRED_KEY = 'jpdb-koohii-starred';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  function getStarStore() {
    try { return JSON.parse(localStorage.getItem(STARRED_KEY)) || {}; } catch (e) { return {}; }
  }
  function readStarred(sid) { var s = getStarStore(); return sid in s ? s[sid] : false; }
  function writeStarred(sid, val) {
    var s = getStarStore(); s[sid] = val;
    localStorage.setItem(STARRED_KEY, JSON.stringify(s));
  }

  function starStory(story, btn) {
    btn.disabled = true;
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://kanji.koohii.com/study/ajax',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ request: 'star', uid: story.uid, sid: story.cid }),
      onload: function (resp) {
        btn.disabled = false;
        var starKey = story.uid + '-' + story.cid;
        var newState;
        try {
          var result = JSON.parse(resp.responseText);
          newState = result.starred !== undefined ? !!result.starred : !readStarred(starKey);
        } catch (e) { newState = !readStarred(starKey); }
        writeStarred(starKey, newState);
        var glyph = btn.querySelector('span:last-child');
        if (glyph) glyph.textContent = newState ? '★' : '☆';
        btn.title = newState ? 'Starred on koohii' : 'Star on koohii';
        btn.style.opacity = newState ? '1' : '0.35';
      },
      onerror: function () { btn.disabled = false; }
    });
  }

  function makeStoryEl(story, isLast) {
    var starKey = story.uid && story.cid ? story.uid + '-' + story.cid : '';
    var starred = starKey ? readStarred(starKey) : false;
    var item = document.createElement('div');
    item.style.cssText = 'margin-bottom:0.55rem;padding-bottom:0.55rem;' +
      (!isLast ? 'border-bottom:1px solid rgba(128,128,128,0.12);' : '');
    var text = document.createElement('p');
    text.style.cssText = 'margin:0 0 0.2rem;font-size:0.9em;line-height:1.4;';
    text.innerHTML = story.text;
    item.appendChild(text);
    var meta = document.createElement('div');
    meta.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:0.75em;';
    var left = document.createElement('span');
    left.style.cssText = 'flex:1;opacity:0.4;';
    var leftParts = [];
    if (story.author) leftParts.push(story.author);
    if (story.date)   leftParts.push(story.date);
    left.textContent = leftParts.join(' · ');
    meta.appendChild(left);
    if (story.uid && story.cid) {
      var starBtn = document.createElement('button');
      starBtn.title = starred ? 'Starred on koohii' : 'Star on koohii';
      starBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1em;padding:4px 6px;color:inherit;opacity:' + (starred ? '1' : '0.35') + ';line-height:1;display:inline-flex;align-items:center;justify-content:center;gap:3px;margin-right:-6px;vertical-align:middle;';
      if (story.stars) {
        var starsEl = document.createElement('span');
        starsEl.style.cssText = 'font-size:0.9em;';
        starsEl.textContent = story.stars;
        starBtn.appendChild(starsEl);
      }
      var starGlyph = document.createElement('span');
      starGlyph.textContent = starred ? '★' : '☆';
      starBtn.appendChild(starGlyph);
      starBtn.onclick = function (e) { e.preventDefault(); starStory(story, starBtn); };
      meta.appendChild(starBtn);
    }
    item.appendChild(meta);
    return item;
  }

  function makeSubDivider(label) {
    var d = document.createElement('div');
    d.style.cssText = 'font-size:0.7em;opacity:0.35;margin:0.5rem 0 0.3rem;text-transform:uppercase;letter-spacing:0.05em;';
    d.textContent = label;
    return d;
  }

  var koohiiContainer = null;
  var fetchSeq = 0;

  function injectStories(data) {
    var favs   = data.favs   || [];
    var shared = data.shared || [];

    if (koohiiContainer) koohiiContainer.remove();
    koohiiContainer = document.createElement('div');

    var koohiiUrl = 'https://kanji.koohii.com/study/kanji/' + encodeURIComponent(kanji);
    var divider = document.createElement('div');
    divider.style.cssText = 'display:flex;align-items:center;gap:8px;margin:1rem 0 0.6rem;font-size:0.75em;';
    var hr1 = document.createElement('hr');
    hr1.style.cssText = 'flex:1;border:none;border-top:1px solid currentColor;margin:0;opacity:0.4;';
    var link = document.createElement('a');
    link.href = koohiiUrl;
    link.target = '_blank';
    link.textContent = 'kanji.koohii.com';
    link.style.cssText = 'color:inherit;text-decoration:none;opacity:0.4;white-space:nowrap;';
    link.onmouseover = function () { link.style.opacity = '0.8'; };
    link.onmouseout = function () { link.style.opacity = '0.4'; };
    var hr2 = document.createElement('hr');
    hr2.style.cssText = 'flex:1;border:none;border-top:1px solid currentColor;margin:0;opacity:0.4;';
    var refreshBtn = document.createElement('button');
    refreshBtn.title = 'Refresh from koohii';
    refreshBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1em;padding:4px 6px;color:inherit;opacity:0.4;line-height:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;margin-right:-6px;vertical-align:middle;';
    var refreshText = document.createElement('span');
    refreshText.textContent = 'refresh';
    refreshText.style.cssText = 'font-size:0.8em;line-height:1;';
    var refreshGlyph = document.createElement('span');
    refreshGlyph.style.cssText = 'line-height:1;display:inline-flex;align-items:center;';
    refreshGlyph.textContent = '↺';
    refreshBtn.appendChild(refreshText);
    refreshBtn.appendChild(refreshGlyph);
    refreshBtn.onmouseover = function () { refreshBtn.style.opacity = '0.9'; };
    refreshBtn.onmouseout = function () { refreshBtn.style.opacity = '0.4'; };
    refreshBtn.onclick = function (e) {
      e.preventDefault();
      localStorage.removeItem(CACHE_KEY);
      fetchAndCache();
    };
    divider.appendChild(hr1);
    divider.appendChild(link);
    divider.appendChild(hr2);
    divider.appendChild(refreshBtn);
    koohiiContainer.appendChild(divider);
    mnParent.appendChild(koohiiContainer);

    if (!favs.length && !shared.length) return;

    if (favs.length) {
      koohiiContainer.appendChild(makeSubDivider('Your favourites'));
      favs.forEach(function (s, i) {
        koohiiContainer.appendChild(makeStoryEl(s, i === favs.length - 1 && !shared.length));
      });
    }
    if (shared.length) {
      if (favs.length) koohiiContainer.appendChild(makeSubDivider('Community'));
      shared.forEach(function (s, i) {
        koohiiContainer.appendChild(makeStoryEl(s, i === shared.length - 1));
      });
    }
  }

  function parseKoohiiPage(doc) {
    var titles      = [...doc.querySelectorAll('.sharedstories_title')];
    var favTitle    = titles.find(function (t) { return /favourite/i.test(t.textContent); });
    var sharedTitle = titles.find(function (t) { return /shared/i.test(t.textContent); });
    var favEnd      = favTitle    ? (titles[titles.indexOf(favTitle)    + 1] || null) : null;
    var sharedEnd   = sharedTitle ? (titles[titles.indexOf(sharedTitle) + 1] || null) : null;

    function between(el, start, end) {
      if (!start || !el) return false;
      try {
        return !!(start.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          (!end || !!(end.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING));
      } catch (e) { return false; }
    }

    var seen = new Set();
    var favs = [], shared = [];

    [...doc.querySelectorAll('.story')].forEach(function (storyEl) {
      var text = storyEl.innerHTML.trim();
      if (!text) return;

      var container = null, node = storyEl.parentElement;
      while (node && node.tagName !== 'BODY') {
        if (node.classList && node.classList.contains('sharedstory') &&
          node.querySelector('.sharedstory_author')) {
          container = node;
          break;
        }
        node = node.parentElement;
      }
      if (!container) return;

      var actions  = container.querySelector('.sharedstory-actions');
      var uid      = actions ? (actions.dataset.uid || '') : '';
      var cid      = actions ? (actions.dataset.cid || '') : '';
      // data-cid is the kanji UCS code (same for all stories) — dedup by uid instead
      if (uid && seen.has(uid)) return;
      if (uid) seen.add(uid);

      var authorEl = container.querySelector('.sharedstory_author a');
      var dateEl   = container.querySelector('.lastmodified');
      var starSpan = actions ? actions.querySelector('.JsStar span') : null;
      var story = {
        text:   text,
        author: authorEl ? authorEl.textContent.trim() : '',
        uid:    uid,
        cid:    cid,
        date:   dateEl ? dateEl.textContent.trim() : '',
        stars:  starSpan ? (parseInt(starSpan.textContent.trim(), 10) || 0) : 0,
      };

      if (between(container, favTitle, favEnd))       favs.push(story);
      else if (between(container, sharedTitle, sharedEnd)) shared.push(story);
    });

    return { favs: favs, shared: shared.slice(0, koohiiCount) };
  }

  function fetchAndCache() {
    var seq = ++fetchSeq;
    if (koohiiContainer) koohiiContainer.remove();
    var placeholder = document.createElement('div');
    placeholder.style.cssText = 'margin-top:0.5rem;font-size:0.85em;opacity:0.45;';
    placeholder.textContent = 'Loading koohii stories…';
    mnParent.appendChild(placeholder);
    koohiiContainer = placeholder;

    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://kanji.koohii.com/study/kanji/' + encodeURIComponent(kanji),
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
      },
      onload: function (resp) {
        if (seq !== fetchSeq) { placeholder.remove(); return; }
        placeholder.remove();
        koohiiContainer = null;
        var doc = new DOMParser().parseFromString(resp.responseText, 'text/html');
        var data = parseKoohiiPage(doc);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
        injectStories(data);
      },
      onerror: function () { if (seq === fetchSeq) { placeholder.remove(); koohiiContainer = null; } }
    });
  }

  reloadKoohii = function () {
    localStorage.removeItem(CACHE_KEY);
    fetchAndCache();
  };

  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      var data = cached.data;
      // handle old flat-array cache format
      if (Array.isArray(data)) data = { favs: [], shared: data };
      injectStories(data || { favs: [], shared: [] });
    } else {
      fetchAndCache();
    }
  } catch (e) {
    fetchAndCache();
  }

})();

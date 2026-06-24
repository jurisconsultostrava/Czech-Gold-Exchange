---
name: SwissGold reference design extraction
description: How the real SwissGold.cz visual design was reverse-engineered from an MHTML capture, and the resulting design tokens.
---

# SwissGold.cz reference design

The user supplied the real site as an MHTML capture (`attached_assets/SwissGold.cz_*.mhtml`). Its CSS (`css/style.css`) is embedded quoted-printable.

**How to decode:** extract the CSS line range, then quoted-printable-decode (replace `=\r?\n` soft breaks, then `=HH` hex escapes). `python3` is NOT available in this env — use Node. Decoded copy saved at `attached_assets/swissgold-reference.css`.

**Design tokens (reference ground truth):**
- gold #c9a96a, gold-2 #d9bf85, gold-3 #8a7242
- ink #f5f1e8, ink-2 #c8c2b3, ink-3 #8a8479
- bg ~#0d0d0f, bg-2 #131315, bg-3 ~#1a1a1e, line-2 #3a3a42
- fonts: Manrope (display), Inter (body), JetBrains Mono (mono); radius 2px / 4px
- ticker: dark gradient bg (#0d0d0f→#131315), gold border-bottom, mono font, continuous 45s linear scroll marquee (duplicate the track and translateX -100% for seamless loop) — NOT a one-shot entrance animation
- product card anatomy: "Investiční kov" eyebrow + "Skladem ČR" pill badge (gold-3 bg, white text, top-left) + "Detail →" link
- header: logo + nav + CZK/EUR currency toggle + "Přihlásit" account link + cart

**Why:** the first design pass used a different aesthetic; matching the real site required these exact values. The frontend already used token names (gold, ink-N, bg-N) — only the values in `index.css :root` needed updating, not the class usage.

---
name: Android TV IPTV display constraints
description: User-defined display rules for the IPTV player.
---

Do not show “LIVE” text or UDP multicast stream URLs in the IPTV player interface.

**Why:** the user explicitly asked that playback UI not expose these labels or addresses.

**How to apply:** keep the stream address internal; do not surface it in channel rows, overlays, playback controls, or error text.

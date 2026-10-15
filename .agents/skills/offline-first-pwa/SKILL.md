---
name: offline-first-pwa
description: >-
  Use this skill whenever building, auditing, or optimizing offline-first Progressive Web Apps (PWAs),
  service workers, caching strategies, and PWABuilder/APK compliance.
---

# Offline-First PWA Skill

## Core Principles
1. **Cache Core Assets:** Always cache index.html, style.css, app.js, icon.svg, and manifest.json.
2. **Stale-While-Revalidate / Cache-First:** Serve cached local assets immediately so the app boots in under 100ms.
3. **Graceful Cloud Fallback:** If internet is unavailable, save logs to localStorage and queue cloud sync for when online.
4. **PWABuilder Android Readiness:**
   - Manifest must include standalone display, theme/background colors, and separated any + maskable icon purposes.
   - A registered active service worker (sw.js) must be present.

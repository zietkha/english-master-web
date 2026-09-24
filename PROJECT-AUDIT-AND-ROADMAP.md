# English Master Web — Technical Audit & Redesign Roadmap

**Repo:** github.com/zietkha/english-master-web
**Audit date:** based on live code review of `login.html`, `index.html`, `app.js`, `admin.html`, `admin.js`, `api/generate-lesson.js`
**Purpose:** This document lists every issue found in the current codebase, why it matters, and exactly what to build instead — organized so it can be handed to a developer (or an AI coding agent) as a work order.

---

## 1. Executive Summary

The current build is a solid **visual prototype**: the animation quality, tab transitions, toast system, and modal patterns are already close to production-grade. However, the **data and security architecture is not safe for real users**. Passwords are stored in plaintext, the admin panel is protected by a hardcoded PIN visible in public JavaScript, and the entire app runs primarily on `localStorage` with Firebase treated as an optional add-on instead of the source of truth.

This document is split into four parts:
1. Critical security fixes (must happen before any real user signs up)
2. Architecture split: User app vs Admin console
3. UI/UX redesign: white + blue "liquid glass" visual system
4. Product gaps vs. mature learning platforms (Duolingo, Quizlet, Khan Academy) — issues the user did not ask about but should know

---

## 2. Critical Security & Architecture Fixes

### 2.1 Passwords stored in plaintext
**Where:** `app.js` (user seed data), `login.html` (login/signup handlers)
**Problem:** User records are stored as `{ email, password: '123', ... }` directly in `localStorage`, and login compares `u.password === pass` as plain string equality. Anyone with DevTools access to a shared or public computer can read every email/password pair that ever logged in on that browser.
**Fix:**
- Make Firebase Authentication the *only* authentication path. Remove the plaintext local-user login/signup logic entirely — it should not exist as a "fallback," even for demo purposes.
- Passwords are never stored by your own code; Firebase Auth handles hashing and storage server-side.
- Remove the hardcoded demo accounts (`admin@gmail.com/123`, `kiet@gmail.com/123`, etc.) from `app.js`. If demo accounts are needed for testing, create them through the Firebase console, not hardcoded in shipped JS.

### 2.2 Admin panel protected by a hardcoded PIN
**Where:** `admin.js` line ~25: `if (pin === 'admin123' || pin === '123')`
**Problem:** This PIN is visible to anyone who views page source (Ctrl+U) on `admin.html`. There is no real authentication — anyone who finds the admin URL has full control (view all feedback, toggle maintenance mode, edit user data).
**Fix:**
- Gate `admin.html` behind Firebase Authentication.
- Store a `role` field per user in Firestore (`role: "admin"` or `role: "learner"`).
- On admin page load, check `firebase.auth().currentUser` and verify their Firestore role server-side (via a Cloud Function or Firestore Security Rules — never trust a client-side role check alone, since a user could edit their own `localStorage` copy of their role).
- Ideally use [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) for `role: admin`, checked via Firestore Rules, so the permission is enforced server-side and cannot be spoofed from the browser.

### 2.3 App state lives in `localStorage`, Firebase is optional
**Where:** `app.js` — `firebaseConfig` is read from `localStorage.getItem('english_master_firebase_config')`, defaults to empty/disabled.
**Problem:** Without Firebase actively configured, all users, lessons, XP, streaks, and badges exist only inside one browser. Two different users never see the same data. Clearing browser cache deletes all progress. This makes the "multi-user product" claim untrue in practice.
**Fix:**
- Hardcode the Firebase web config (`apiKey`, `projectId`, etc.) directly into the app. **Note:** Firebase web config values are not secret — they identify the project, not grant access — so this is safe to commit to a public repo. Real access control lives in Firestore Security Rules, not in hiding this config.
- Remove the admin UI that lets someone manually paste in a Firebase config at runtime — this should be a build-time constant, not a runtime setting.
- Firestore becomes the single source of truth for: users, lessons, feedback, XP/streak/badges. `localStorage` may still be used for *non-sensitive* UI preferences only (e.g., theme, last active tab).

### 2.4 Gemini API key exposed via client-side call path
**Where:** `app.js` line ~11 (`apiKey: localStorage.getItem('english_master_gemini_key')`) and line ~454-455, which calls `generativelanguage.googleapis.com` directly from the browser using a key pulled from `localStorage`.
**Problem:** Even though `api/generate-lesson.js` correctly keeps the Gemini key server-side (this part is done right), this second client-side path defeats that protection entirely. If this path is ever enabled (via the admin "AI engine" setting), the API key is sent in a plain, visible network request from any user's browser — anyone can extract it and use it for free at your expense.
**Fix:**
- Delete the client-side Gemini call path completely. There should be exactly one way to generate a lesson: `fetch('/api/generate-lesson', ...)`.
- Delete the "AI engine" selector and "Gemini API key" input field from both `app.js` and any UI (`index.html`, `admin.html`) that expose it.
- The only place `GEMINI_API_KEY` should exist is as a Vercel environment variable read by `process.env.GEMINI_API_KEY` inside `api/generate-lesson.js`.

### 2.5 (Optional, per your decision) AI endpoint has no rate limiting
**Status:** You've decided to leave this open for now — noted as an accepted risk, not fixed in this pass. If you change your mind later: add a per-user daily counter (Firestore field `dailyAiCalls` + `lastResetDate`) checked before calling Gemini, tied to the user's Firebase ID token so it can't be spoofed by calling the endpoint directly.

---

## 3. Architecture: Split User App vs Admin Console

The project already separates files (`index.html`/`app.js` vs `admin.html`/`admin.js`), which is the right instinct — but the separation currently only hides UI with CSS, it doesn't enforce a real permission boundary. The fix is to make the split real at the data and auth layer, not just the file layer.

### 3.1 Layer 1 — User App (`index.html` + `app.js`)
Contains only what a single learner is allowed to see and change about **themselves**:
- Mode switch (IELTS / Elementary review)
- Lesson creation form (calls `/api/generate-lesson`, gated behind login)
- Flashcards, quiz, XP, streak, badges — all scoped to `currentUser.uid`
- Profile: display name, password change (via Firebase, never via localStorage)
- Feedback submission

**Must NOT contain:** any Gemini API key field, any Firebase config field, any "maintenance mode" toggle, any list of other users' data.

### 3.2 Layer 2 — Admin Console (`admin.html` + `admin.js`)
Only reachable by a Firebase-authenticated user whose Firestore `role == "admin"`:
- Aggregate stats: total users, total AI calls, feedback inbox
- Toggle maintenance mode (write to a single Firestore document, read by all clients — not `localStorage`, since that's per-browser and wouldn't actually affect other users)
- Suspend/reactivate user accounts
- **No API key or Firebase config inputs** — these live in Layer 3, not in any UI at all.

### 3.3 Layer 3 — Infrastructure / Environment Variables
Not a web page. Configuration that should never exist in browser-executable JavaScript:
- `GEMINI_API_KEY` — Vercel environment variable only
- Firestore Security Rules — the real enforcement layer for "who can read/write what." Example shape:
  ```
  match /users/{userId} {
    allow read, update: if request.auth.uid == userId;
    allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  }
  ```

### 3.4 Suggested Firestore Collections
```
users/{uid}          → name, email, role, xp, streak, badges[], status
lessons_ielts/{id}   → title, summary, vocab[], quiz[], authorId, createdAt
lessons_tieuhoc/{id} → (same shape)
feedback/{id}        → message, contact, page, createdAt, userId (if logged in)
```

---

## 4. UI/UX Redesign: White + Blue "Liquid Glass" System

Goal: move from the current flat card/gradient-blob look to a soft, translucent, layered "liquid glass" aesthetic (inspired by iOS 26's Liquid Glass material) — while staying strictly within the existing white/blue palette. This is a *material* change (how surfaces look and behave), not a *color* change.

### 4.1 Design tokens (extend existing CSS variables, do not replace them)
Keep: `--bg:#f4f7fe; --panel:#ffffff; --panel2:#eef3ff; --border:#dbe4f5; --text:#152238; --muted:#6b7794; --accent:#2563eb; --accent-dark:#1d4ed8;`

Add glass-specific tokens:
```css
--glass-bg: rgba(255,255,255,0.55);
--glass-bg-strong: rgba(255,255,255,0.72);
--glass-border: rgba(255,255,255,0.6);
--glass-blur: 24px;
--glass-shadow: 0 8px 32px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.5);
--glass-highlight: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%);
```
Dark mode equivalents should reduce opacity and shift toward deep navy rather than black, keeping the blue identity:
```css
--glass-bg-dark: rgba(20,28,48,0.55);
--glass-border-dark: rgba(255,255,255,0.08);
```

### 4.2 Glass surface recipe (apply to cards, modals, nav bar)
```css
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
}
.glass-panel::before {
  content: '';
  position: absolute; inset: 0;
  background: var(--glass-highlight);
  pointer-events: none;
}
```
Use `backdrop-filter` everywhere a card currently uses a flat `background: var(--panel)`. This is what produces the "frosted, light passing through" feel — it requires there to be *something* behind the glass (the animated background below), otherwise the blur has nothing to diffuse and looks flat.

### 4.3 Animated background (behind every glass panel)
Replace the static gradient + 3 blurred circles with a slow, layered mesh gradient that drifts continuously (not just on load):
- 3–4 large soft blue blobs (`#93c5fd`, `#60a5fa`, `#bfdbfe`, `#eaf2ff`) at low opacity (0.25–0.4), each with an independent slow drift animation (18–26s loops, staggered delays), using `filter: blur(80px)` so edges disappear completely.
- Optional: a very subtle animated grain/noise overlay at ~3% opacity to prevent the blur from looking artificially smooth/banded (a common "cheap gradient" tell).
- Respect `prefers-reduced-motion`: pause all blob drift and reduce transition durations to near-zero when the user has this OS setting on.

### 4.4 Typography
Current stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) is fine functionally but generic. Recommendation:
- Primary: **Inter** or **Plus Jakarta Sans** (via Google Fonts, both have excellent Vietnamese diacritic support — verify this explicitly, many geometric sans fonts render Vietnamese tone marks poorly).
- Use a tighter, more confident type scale: headings at `-0.02em` letter-spacing, body text at default. Weight 600–700 for headings, 400–500 for body, 700 for buttons/labels — avoid using more than 3 weights total to keep the page light.
- Numbers (XP, streak, scores) should use `font-variant-numeric: tabular-nums` so they don't visually jitter when counting up.

### 4.5 Login / Register screen — full spec
This is the first thing every user sees, so it deserves the most polish:
- **Background:** the animated mesh-gradient blob system from 4.3, full-bleed behind everything.
- **Card:** `.glass-panel` style card, slightly larger radius (28px), entrance animation: fade + rise + very slight scale (0.97 → 1), eased with `cubic-bezier(.16,1,.3,1)` for a "settling" feel rather than a linear ease.
- **Tab switch (Login ⇄ Register):** the existing sliding highlight is good — enhance it with a brief squash/stretch on the highlight itself during the transition (scale-x 1 → 1.08 → 1 over the transition) to feel more "liquid" rather than mechanical, consistent with the glass theme.
- **Input fields:** on focus, in addition to the current border glow, add a very subtle inner glass highlight sweep (a soft light gradient that moves across the input border once on focus) — this is a signature Liquid Glass detail (light reacting to interaction).
- **Error shake:** keep the existing shake-on-wrong-password behavior; pair it with a brief red glass-tint pulse on the card border instead of only the shake, so the feedback is visible even to someone who has motion-reduction preferences partially affecting perception of the shake.
- **Primary button:** should look like a solid glass "pill" — not flat fill, but a gradient with a soft top highlight (`linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 50%)` layered over the accent blue) to catch light like the rest of the glass system. Loading state: replace the current text-swap with a proper inline spinner + disabled dimmed glass state.
- **Google button:** keep as a lighter glass variant (less blur, more opacity) so it reads as secondary without needing a different color.
- **Toast notifications:** upgrade to true glass panels (per 4.2) instead of flat white, sliding in from the bottom with a slight overshoot bounce.

### 4.6 Motion principles to apply site-wide
- Standard ease: `cubic-bezier(.16,1,.3,1)` for anything "entering" (cards, modals, toasts) — this reads as natural deceleration rather than robotic linear/ease-in-out.
- Standard duration: 250–400ms for UI transitions, 150ms for micro-interactions (button press, icon toggle).
- Never animate more than opacity + transform (translate/scale) for performance — avoid animating `width`, `height`, `top/left`, or `box-shadow` directly on every frame, since these force layout recalculation and will visibly stutter on low-end phones (an explicit requirement from the original project brief: "không làm rối mắt hay chậm máy yếu" / must not lag weak devices).

---

## 5. Product Gaps Not Yet Mentioned by the User

These are issues found during the code review that go beyond what was explicitly asked for, but materially affect whether this product can compete with — or even just satisfy users coming from — Duolingo/Quizlet/Khan Academy.

### 5.1 No real personalization loop
The AI currently generates a lesson from whatever text is pasted, with no memory of the learner's history. There is no tracking of *which vocabulary words or grammar patterns the user consistently gets wrong*, so nothing adapts over time. This is the single biggest gap between "a tool that generates quizzes" and "a tutor that teaches you." Recommended minimum viable version: log each quiz answer (`correct: bool`, `topic/word tested`) to Firestore per user, and feed a summary of weak areas into the Gemini prompt on the next lesson generation ("this learner frequently struggles with past-tense verbs and IELTS academic vocabulary about environment — bias new content toward reinforcing these").

### 5.2 No spaced repetition, despite being advertised
The landing page copy explicitly promises "Spaced Repetition" (`index.html` feature card: "Lặp lại ngắt quãng... giúp nhớ từ vựng lâu gấp 3 lần"), but no scheduling logic exists in the code — flashcards appear to just be a static list, not resurfaced based on a forgetting curve. This is a credibility risk: shipping marketing copy for a feature that doesn't exist yet. Either implement a basic SM-2-style interval (even a simplified 3-bucket version: "new / learning / mastered," resurfaced at increasing intervals) or remove the claim until it's built.

### 5.3 Data quality of AI-generated content is not verified
Lessons are inserted directly from the Gemini response into Firestore with no human review step and no confidence/quality check. For an IELTS or elementary-school English product, an incorrect vocabulary translation or a wrong quiz answer key directly damages trust with parents/students. Recommended: add a lightweight "report this lesson" action (distinct from general feedback) that flags a specific lesson for admin review, and consider a periodic spot-check admin queue for newly generated lessons.

### 5.4 No onboarding for first-time users
The original brief mentioned a 3–4 step onboarding flow; it's not present in the current build. First-run experience currently drops a new user straight into an empty dashboard with no guidance on what to do first. This is one of the highest-leverage, lowest-effort additions for retention.

### 5.5 No empty states
When a user has no saved lessons yet, the UI likely just shows a blank or minimal list (needs confirming in `index.html`'s lesson list rendering) rather than an illustrated empty state with a clear call-to-action ("Create your first lesson"). Empty states are a small effort, high perceived-polish item.

### 5.6 Accessibility gaps
- No visible `:focus-visible` styling distinct from mouse `:hover` states was found — keyboard-only users (and users of screen readers) will struggle to tell what's focused.
- Icons appear to rely on emoji (💬, 📘, ⚡) for primary UI affordances rather than SVG icon sets — emoji render inconsistently across OS/browser and are not screen-reader-friendly without explicit `aria-label`s.
- No skip-link, no `aria-live` region confirmed for the toast system (toasts should announce themselves to screen readers).

### 5.7 No password strength / breach-check feedback
Signup only checks length ≥ 6 characters. No feedback on weak/common passwords. Since this app will hold real learner data (children's names, in the case of the elementary-school mode), this is worth tightening — consider Firebase Auth's built-in options or a simple zxcvbn-style strength meter.

### 5.8 No terms of service / privacy notice
Given the elementary-school ("Tiểu học") mode implies the product may collect data from or about minors, and Vietnam has data protection regulations (Nghị định 13/2023/NĐ-CP on personal data protection) that apply to any service processing personal data of Vietnamese users — including children's data, which typically requires guardian consent — a basic privacy policy and terms page should exist before any public launch, not just before monetization. This is a legal gap, not just a UX one.

### 5.9 No analytics / usage instrumentation
There's no way currently to answer "how many people actually complete a quiz vs. abandon it," "which lessons get created most," or "what's the day-7 retention." Without this, product decisions (including the personalization and monetization work planned next) will be made blind. Even a lightweight event log to Firestore (`event: 'lesson_created' | 'quiz_completed' | 'flashcard_flip'`, `userId`, `timestamp`) is enough to start.

### 5.10 Monetization readiness (for later, once security fixes land)
Per earlier discussion: recommended model is freemium with a daily AI-generation cap for free users, subscription or one-time "exam prep pack" pricing for paid tiers. None of this can be implemented safely until Section 2's fixes are in place, since usage limits and payment tiers both depend on `currentUser` being a real, server-verified identity rather than a `localStorage` object anyone can edit by hand.

### 5.11 Cross-device and cross-browser compatibility
Current CSS is not confirmed to have been tested across the full device matrix a real launch needs. This needs to be explicit, not assumed, because "looks fine on my laptop in Chrome" is not the same as "works on every device a Vietnamese learner or parent actually owns."

**Target device/viewport matrix (minimum):**
| Category | Examples | Width range |
|---|---|---|
| Small phones | iPhone SE, older Android budget phones | 360–390px |
| Standard phones | iPhone 14/15/16, mainstream Android | 390–430px |
| Tablets (portrait) | iPad, Android tablets | 768–834px |
| Tablets (landscape) / small laptops | iPad landscape, small Chromebooks | 1024–1280px |
| Laptops / desktop | Standard monitors | 1366–1920px |
| Large/external monitors | 1440p, 4K | 2560px+ |

**Concrete requirements:**
- Use fluid, relative units (`rem`, `%`, `clamp()`, `min()`/`max()`) instead of fixed pixel widths for layout containers, so the same markup scales instead of needing separate breakpoints for every size.
- Test breakpoints at minimum: 375px, 768px, 1024px, 1440px (this matches the checklist already referenced in the project's own "UI UX Pro Max" notes — carry it through to actual implementation, not just as a checklist item).
- **iOS Safari specifics:** account for the dynamic Safari toolbar (address bar that shows/hides on scroll) by using `100dvh` (dynamic viewport height) instead of `100vh` for any full-screen layout (e.g., the login screen), since `100vh` on iOS Safari is measured against the *largest* possible viewport and causes content to be cut off behind the toolbar.
- **Safe areas:** already partially handled (`env(safe-area-inset-bottom, 0px)` appears in `login.html`) — extend this consistently to `env(safe-area-inset-top, 0px)` as well, and apply it to any element pinned to the top or bottom of the screen (headers, floating action buttons, bottom nav if one is added later), not just the login wrapper.
- **Touch targets:** all buttons, tab switches, and the floating feedback button must be at least 44×44px (Apple HIG) / 48×48dp (Material Design) tappable area — verify this explicitly on the tab switcher and any icon-only buttons, since compact desktop-oriented spacing often fails this on mobile.
- **Input zoom bug:** iOS Safari auto-zooms the page when focusing an `<input>` with `font-size` below 16px. Every form input must be `font-size: 16px` or larger to prevent this jarring zoom-in on every login/signup field tap.
- **Horizontal scroll:** wide elements (long lesson content, quiz option text, any future data table in the admin console) must scroll inside their own `overflow-x: auto` container — the page body itself should never scroll sideways on any device.
- **Browser support baseline:** target the last 2 versions of Chrome, Safari, Edge, and Firefox, plus Samsung Internet (common on Android in Vietnam). `backdrop-filter` (needed for the liquid-glass system in Section 4) has good support in this baseline but should degrade gracefully — provide a solid-color fallback background for any browser where `backdrop-filter` is unsupported, using `@supports (backdrop-filter: blur(1px))` to conditionally apply the glass effect.
- **Performance on low-end Android:** the existing project brief already flags this ("không làm rối mắt hay chậm máy yếu"). Explicitly test the animated background and glass blur effects on a mid/low-tier Android device (or throttle CPU 4–6x in Chrome DevTools as a proxy) — `backdrop-filter` and multiple blurred, animated blobs are two of the most expensive CSS effects to render, and stacking both (as this redesign does) is exactly the kind of combination that looks great on a MacBook and stutters on a $150 Android phone. Consider reducing blob count or blur radius, or disabling the animated background entirely, below a certain viewport width or via a `prefers-reduced-motion`/manual "lite mode" toggle.
- **PWA baseline (recommended, not required):** add a `manifest.json` and app icons so the site can be "Added to Home Screen" on both iOS and Android, giving it an app-like icon and splash screen without needing to build native apps — low effort, meaningfully raises perceived quality for a learning app used daily.

---

## 6. Branding & Copyright

### 6.1 Product identity
- **Product name:** English Kha Master
- **Founder / Developer credit:** Nguyễn Viết Kha — Sinh viên CNTT, Trường Đại học HUTECH, TP.HCM
- This replaces the current generic "📘 Học & Ôn Tiếng Anh" header branding used in `login.html`/`index.html`. The existing footer credit line ("Phần mềm được phát triển bởi Nguyễn Viết Kha...") should remain in place *in addition to* the new logo/name — the footer credits authorship, the logo establishes product identity; both should be present and consistent site-wide.

### 6.2 Logo concept
No logo asset currently exists in the repo (the header uses a plain 📘 emoji as a placeholder). Recommended direction, consistent with the white/blue liquid-glass system in Section 4:
- A simple wordmark-based logo is the fastest to ship and most consistent with the glass aesthetic: **"English Kha Master"** or a shortened **"EKM"** monogram, set in the same typeface chosen in Section 4.4, in `--accent-dark` (#1d4ed8) on light backgrounds.
- If a symbol/icon is wanted alongside the wordmark, keep it simple and ownable — e.g., an abstract open-book or speech-bubble mark built from the same rounded-corner, glass-panel visual language as the rest of the UI (soft rounded shapes, no hard edges), rather than a literal, generic "graduation cap" or "book" clipart look shared by hundreds of other learning apps.
- Provide the logo as an SVG (scales cleanly at any size, works in both light/dark mode by swapping a CSS variable for fill color) rather than a raster PNG, and export a simplified icon-only version for favicon/PWA app icon use at small sizes (16×16 up to 512×512).
- Since this is original branding you're creating (not referencing Duolingo/Quizlet/etc. visual identity, consistent with the original project brief's instruction to only borrow UX patterns, never logos or brand assets), there's no copyright concern here — this is fully yours to trademark or register later if the product grows.

### 6.3 Where the identity should appear
- Browser tab favicon (icon-only mark)
- Login/register screen header (full wordmark, largest/most prominent placement — first thing every user sees)
- Main app header/nav bar (wordmark, smaller)
- Footer on every primary page (existing "Phần mềm được phát triển bởi Nguyễn Viết Kha" credit line — keep as-is, it's already correctly placed per the original project requirements)
- PWA app icon and splash screen, if the manifest.json from Section 5.11 is implemented
- Loading/splash states (e.g., initial page load skeleton, per Section 5.5's empty-state work) — a small opportunity to reinforce identity during otherwise "dead" loading moments

### 6.4 Legal note on the name
"English Kha Master" as a product name and any logo built from it should be safe to use freely — it doesn't reference or resemble any existing major brand (Duolingo, Quizlet, etc.), so there's no trademark conflict risk from the name itself. If you later intend to register this as a formal business name or trademark in Vietnam, that's a separate administrative step (Cục Sở hữu trí tuệ for trademark registration) and not something that blocks development — the name can be used informally on the live product well before any formal registration.

---

## 7. Suggested Build Order

1. Firebase Authentication as sole auth path (Section 2.1, 2.3)
2. Firestore Security Rules + admin role check (Section 2.2)
3. Remove client-side Gemini key path entirely (Section 2.4)
4. Split user/admin data access cleanly per Section 3
5. Branding pass: logo, favicon, header/footer identity (Section 6) — do this alongside step 6, since the visual redesign is the natural place to drop the new logo/wordmark in
6. Liquid-glass visual system + login/register polish + responsive/device pass (Section 4, 5.11)
7. Onboarding, empty states, accessibility pass (Section 5.4–5.6)
8. Basic personalization loop + spaced repetition (Section 5.1–5.2)
9. Analytics instrumentation (Section 5.9)
10. Monetization / usage tiers (Section 5.10)

Steps 1–4 are foundational — building the visual redesign (steps 5–6) on top of the current auth model means redoing UI work later when the auth model changes. It's recommended to do 1–4 first even though the user's most recent requests prioritized the visual/branding work. Device compatibility (Section 5.11) should be validated continuously during step 6, not treated as a separate pass afterward — retrofitting responsive fixes onto an already-built glass UI is far more expensive than building it responsive from the start.

---

## 8. Implementation Addendum — Gaps Found in the Antigravity Build Plan

This section responds to a specific implementation plan drafted by an AI coding agent ("Antigravity") based on this document. The plan correctly captured the file-level changes (Section 2–4 above), but omitted several operational steps without which the plan will fail on first run or silently remain insecure. These must be added to the plan's scope before execution.

### 8.1 Missing step: create the real Firebase project first
The plan assumes a Firebase project with Authentication and Firestore already exists and simply needs its config "hardcoded" into the app. If no real project exists yet, every auth call will fail immediately. Add this as literal Step 0, before any code changes:
1. Go to https://console.firebase.google.com → Create project.
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Google** providers.
3. In **Firestore Database**, create a database (start in production mode, not test mode — test mode leaves data fully open for 30 days by default).
4. In **Project settings → General**, register a Web App and copy the `firebaseConfig` object (`apiKey`, `authDomain`, `projectId`, etc.) — this is the object that gets hardcoded into the app per Section 2.3. It is safe to commit publicly.

### 8.2 Missing step: bootstrapping the first admin account
The plan says the admin console should "verify Firestore role === 'admin'," but does not say how any account gets that role in the first place. A user cannot be allowed to self-assign `role: 'admin'` through the app UI — if that were possible, anyone could grant themselves admin access, defeating the entire point of the fix. This must be a manual, one-time, out-of-band step:
1. Sign up normally through the app's real registration flow (Firebase Auth) to create your own account.
2. Go to the Firebase Console → Firestore Database → `users` collection → find your document (by your `uid`).
3. Manually edit that document and set the field `role: "admin"`.
4. Only after this manual step will your account pass the admin check in `admin.js`/Firestore Rules.
Document this as a required manual step in the plan's verification checklist — it is not something the AI agent can or should automate, since automating it would recreate the same self-promotion vulnerability being fixed.

### 8.3 Missing scope: Firestore Security Rules must be part of this change, not just client-side role checks
The plan's admin authorization step only describes checking `role === 'admin'` inside `admin.js` (client-side JavaScript). This is necessary but not sufficient — a client-side check only hides UI elements from unauthorized users; it does not stop someone from calling the Firestore REST API or SDK directly (e.g., via browser DevTools console, or any HTTP client) to read or write data they shouldn't have access to. Real enforcement happens in Firestore Security Rules, which run on Google's servers and cannot be bypassed from the client.

Add to the plan's scope: a `firestore.rules` file, deployed via `firebase deploy --only firestore:rules` (or through the Firebase Console's Rules editor), with rules along these lines:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow delete: if isAdmin();
    }

    match /lessons_ielts/{lessonId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin() ||
        (isSignedIn() && resource.data.authorId == request.auth.uid);
    }

    match /lessons_tieuhoc/{lessonId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin() ||
        (isSignedIn() && resource.data.authorId == request.auth.uid);
    }

    match /feedback/{feedbackId} {
      allow create: if true; // feedback can be submitted without login, per current product behavior
      allow read, delete: if isAdmin();
    }

    match /system/{docId} {
      // e.g. the single "maintenance mode" document
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```
This ruleset should be reviewed and adjusted to match the actual final collection names/fields once implemented, but the principle — admin status is checked server-side via `get()` on the requester's own user document, never trusted from client input — must be preserved.

### 8.4 Ambiguous step: how "local preview" should actually run
The plan's verification step says to "run local preview on http://localhost:3000 via browser subagent" without specifying how. This matters because `api/generate-lesson.js` is a Vercel serverless function — opening `index.html` directly in a browser (or via a plain static file server) will make any `fetch('/api/generate-lesson')` call fail with a 404, since there's no server routing that path to the function.

Correct local testing requires the Vercel CLI:
```bash
npm install -g vercel
vercel login
vercel link        # links this folder to the Vercel project
vercel env pull     # pulls GEMINI_API_KEY and other env vars into a local .env file
vercel dev          # runs both the static frontend AND the /api serverless functions locally
```
Add this as an explicit prerequisite in the plan's verification section, and confirm `GEMINI_API_KEY` is actually set in the real Vercel project's **Environment Variables** (Project Settings → Environment Variables on vercel.com) — not just referenced in code — before testing or deploying.

### 8.5 Scope risk: Component 1 bundles too many unrelated changes into `app.js` at once
The plan's Component 1 asks for all of the following inside a single pass over `app.js`: removing plaintext auth, removing the client-side Gemini path, wiring up `onAuthStateChanged`, adding Firestore sync for profile/XP/streak/badges, adding a full spaced-repetition bucket system, and adding a "report lesson" feature. That is a large, unrelated set of changes to a 1400+ line file in one shot, which makes any resulting bug hard to isolate (is it an auth bug, a sync bug, or an SRS bug?).

Recommended split into two separate passes with independent verification between them:
- **Pass A (security-critical, do first):** remove plaintext auth + demo users, remove client-side Gemini key path, wire real Firebase Auth (`onAuthStateChanged`), remove admin PIN, add Firestore Security Rules, bootstrap first admin (8.2). Verify this pass fully (8.6 checklist) before proceeding.
- **Pass B (feature additions, do after Pass A is verified):** Firestore sync for lessons/XP/streak/badges, spaced-repetition buckets, "report lesson" action, empty states, liquid-glass UI, branding.

### 8.6 Missing note: existing local test data will be lost, by design
If any accounts were created during earlier testing using the old plaintext `localStorage` system, they will not carry over once Firebase Auth becomes the only login path — this is expected and correct (that data was insecure and should not be preserved), not a bug to fix. Mention this explicitly in the plan so it isn't mistaken for a regression during testing: after this change, you will need to sign up again through the real Firebase-backed flow to get a working account, including redoing the admin bootstrap step in 8.2.

### 8.7 Clarify: purpose of `web-engs-deploy.zip`
The plan's final step mentions "re-compress updated `web-engs-deploy.zip`" without prior context establishing what this zip is for or where it's used. Before running the plan, confirm with whoever set up the original deployment process: is this zip a manual upload target for a hosting provider other than Vercel (e.g., a separate static host), or a leftover/unused artifact? If it is an active second deployment path alongside the Git-based Vercel deployment, both paths need to be updated together or they will drift out of sync — one link could be serving old, insecure code (with the plaintext auth and hardcoded PIN still active) even after the "real" fix is deployed via Git. If it's unused, remove it from the plan and from the repo to avoid confusion.

### 8.8 Suggested addition to the plan's verification checklist
In addition to the plan's existing verification steps, add:
- [ ] Firebase project created, Email/Password + Google providers enabled, Firestore database created in production mode
- [ ] `firestore.rules` written and deployed (Section 8.3), not just a client-side role check
- [ ] First admin account manually bootstrapped per Section 8.2 and confirmed working
- [ ] `vercel dev` used for local testing (Section 8.4), `GEMINI_API_KEY` confirmed present in real Vercel project settings
- [ ] Attempt to read another user's Firestore document while logged in as a non-admin learner, via the browser console — confirm it is rejected (this tests the Security Rules, not just the UI)
- [ ] Attempt to open `admin.html` directly by URL while logged out, and while logged in as a non-admin learner — confirm both are rejected
- [ ] Confirm `web-engs-deploy.zip` (Section 8.7) is either updated to match or removed from the deployment process
- [ ] Confirm no remaining references to `english_master_gemini_key`, `english_master_firebase_config`, or the plaintext `english_master_users_v2` key exist anywhere in the codebase (`grep -r` for these strings should return zero results after the change)

---

## 9. Second-Pass Review Findings

A closer pass over files not covered in detail in the first audit (`_redirects`, the duplicate `generate-lesson.js` at repo root, `files/index.html`, and meta tag / dead-code checks) surfaced the following. Item 9.1 is critical and should be resolved before any further deployment work.

### 9.1 CRITICAL: Hosting platform mismatch — Netlify config present, but the whole plan assumes Vercel
The repo root contains a `_redirects` file (`/* /index.html 200`), which is **Netlify's** SPA-fallback redirect syntax — this file has no effect on Vercel at all. Meanwhile, `api/generate-lesson.js` is written as a **Vercel serverless function** (`export default function handler(req, res)`), and Section 8.4 of this document instructs testing via `vercel dev`. These two pieces of config point at two different, incompatible hosting platforms.

This needs to be resolved before any deployment or local-testing work continues, because right now it's ambiguous whether the live site is actually served from Netlify or Vercel:
- **If the project is actually deployed on Netlify:** `api/generate-lesson.js` in its current Vercel-function format will not run there at all — it would need to be rewritten as a Netlify Function (`exports.handler = async (event) => {...}`, placed in a `netlify/functions/` folder, with `GEMINI_API_KEY` set in Netlify's environment variable settings instead of Vercel's). The `_redirects` file would then be correct as-is.
- **If the project is actually deployed on Vercel:** the `_redirects` file is a harmless leftover (likely copied from an earlier Netlify experiment or a template) and should be deleted to avoid confusing future maintainers, and SPA fallback routing (if needed at all — this app doesn't appear to use client-side routing that would require it) should instead be configured via a `vercel.json` `rewrites` rule.

**Action required:** confirm which platform the live domain is actually pointed at (check the deployment dashboard / DNS), delete the config belonging to the platform *not* in use, and make sure this is settled before Section 8.4's local testing instructions are followed — testing against the wrong platform's tooling will produce misleading results either way.

### 9.2 No `package.json` or dependency manifest
There is no `package.json` in the repo. This isn't strictly required for a no-build-step static site, but it does mean: no documented Node.js version for the serverless function runtime, no way to pin or track any future npm dependency, and no `vercel dev`/`netlify dev` auto-detection of the project type (both tools work better with at least a minimal `package.json` present). Recommend adding a minimal one:
```json
{
  "name": "english-kha-master",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=18" }
}
```

### 9.3 Dead/duplicate files should be removed, not carried forward
- **Root-level `generate-lesson.js`** is a near-duplicate of `api/generate-lesson.js` — the only difference found is the language of the code comments (Vietnamese vs English). Having two copies of the same serverless function logic is a maintenance hazard: a future fix applied to one will silently not apply to the other. Delete the root-level copy; `api/generate-lesson.js` is the one actually wired to the `/api/generate-lesson` route.
- **`files/index.html`** appears to be an earlier, smaller prototype version of the main app (same CSS variable names, but a much simpler single-file layout with none of the current features). This looks like a leftover from an earlier iteration rather than a file currently linked to from anywhere in the live app. Confirm whether anything still references `files/index.html`; if not, delete it — unused HTML files left in a public repo/deployment are occasionally discoverable and can confuse both future contributors and any automated security scanning of the live site.

### 9.4 Favicon and social preview metadata are missing
`index.html` has a good `<title>` and `<meta name="description">`, but there is no `<link rel="icon">` (favicon) anywhere in the repo, and no Open Graph / Twitter Card meta tags (`og:title`, `og:description`, `og:image`, `twitter:card`). Practical effect: the browser tab shows a generic blank icon, and if a link to the site is ever shared on Zalo, Facebook, or Messenger, it will render as a bare link with no preview image or title card — a small but real credibility/polish gap for something meant to be shared parent-to-parent or student-to-student. This should be bundled into the branding work in Section 6 — the same SVG mark exported for the favicon can double as the `og:image` base.

### 9.5 Inconsistent use of `escapeHtml` before `innerHTML` writes
A quick check found roughly 20 places in `app.js` that assign to `.innerHTML`, but only ~19 calls to the existing `escapeHtml()` helper — close, but not a guaranteed 1:1 match, meaning at least one `innerHTML` write may be inserting unescaped user- or AI-generated content (lesson titles, feedback messages, or Gemini-returned text) directly into the DOM. This is a stored-XSS risk: if a malicious string ever ends up in a lesson title or feedback message (either typed by a user, or — less likely but possible — echoed back oddly by the AI), it could execute as script in another user's (or the admin's) browser when that content is displayed.
**Action:** during the Pass A/Pass B refactor (Section 8.5), audit every `.innerHTML =` assignment in `app.js` and `admin.js` individually, and either route the inserted value through `escapeHtml()` or switch to safer DOM APIs (`textContent`, or building elements with `createElement`/`.textContent` instead of string-concatenated HTML) wherever the value could contain user-supplied or AI-generated text.

### 9.6 No automated tests of any kind
There are currently no unit tests, integration tests, or even a manual smoke-test script/checklist committed to the repo. Given the scope of the refactor being planned (auth system replacement, Security Rules, UI overhaul all at once), this significantly raises the risk of a regression going unnoticed until a real user hits it. At minimum, recommend the manual verification checklist in Section 8.8 be kept as a permanent `TESTING.md` checklist in the repo (not just a one-time PR comment), re-run before every future deploy — this is a low-effort substitute for real automated tests until there's time to add them properly (e.g., Playwright for a few critical end-to-end flows: signup → create lesson → complete quiz → admin login).

### 9.7 No data export/backup path for the admin
Once Firestore becomes the real source of truth (Section 2.3), there is currently no way for the admin to export user data, lesson content, or feedback for backup, analysis, or — importantly — to fulfil a data-deletion request from a user (relevant given the Section 5.8 note on Vietnam's personal data protection decree, especially for the elementary-school/children's-data use case). Recommend a simple "Export as JSON/CSV" action in the admin console for the `users`, `lessons_*`, and `feedback` collections as a low-effort addition once the admin console rebuild (Section 3.2) is underway.

---

## 10. Feature Expansion — Grade/Level Cards, Auth-First Flow, Gamification, Admin Content Tools, AI Chat

This section specifies ten feature requests gathered directly from the product owner after reviewing the live build. It assumes Section 2 (security hardening) and Section 3 (user/admin split) are already implemented, since several items here (per-user leaderboard stats, admin-added content, chat history) depend on Firestore being the real source of truth with a working `role` field.

### 10.1 Data model changes required first

The current schema (`mode: 'ielts' | 'tieuhoc'`, a flat `tag` string) cannot represent "grade 1–5" or "6 CEFR bands × 4 skills." Restructure before building any of the UI below:

```
lessons_tieuhoc/{lessonId}
  grade: 1 | 2 | 3 | 4 | 5
  skill: "reading" | "listening" | "writing" | "speaking"
  title, content, vocab[], quiz[], imageUrl, authorId, authorType: "ai" | "admin"
  createdAt

lessons_ielts/{lessonId}
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  skill: "reading" | "listening" | "writing" | "speaking"
  title, content, vocab[], quiz[], imageUrl, authorId, authorType: "ai" | "admin"
  sourceLabel: string | null   // e.g. "Cambridge IELTS 17, Test 3" — see 10.6
  answerKeyUrl: string | null  // see 10.6
  createdAt

users/{uid}
  name, email, role, status
  grade: 1 | 2 | 3 | 4 | 5 | null      // set for elementary-track learners
  ieltsLevel: "A1".."C2" | null        // set for IELTS-track learners
  xp, streak, badges[]
  stats: {
    totalOnlineSeconds: number
    lastActiveDate: string   // yyyy-mm-dd, for streak/attendance calc
    attendanceDates: string[]  // array of yyyy-mm-dd the user was active, for the leaderboard's "điểm danh" column
    lessonsCompleted: number
  }

chats/{uid}/messages/{messageId}   // Section 10.10
  from: "user" | "admin" | "ai"
  text, createdAt, readByAdmin: boolean
```

Only `role: 'admin'` accounts write `authorType: "admin"` lessons directly (Section 10.7); everything else keeps flowing through `/api/generate-lesson` as already built.

### 10.2 Auth-first landing (Requirement 2)
Currently, `index.html` allows an anonymous visitor to browse the landing/hero section before hitting a login wall on lesson creation. Change to: **any visit to the root URL, if there's no active Firebase session, redirects straight to `login.html`.** No public marketing page in between — this matches the product owner's intent ("vô link thì vô trang đăng ký/đăng nhập trước").

Implementation:
```javascript
// at the top of index.html's init script
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }
  initApp(user); // existing app bootstrap
});
```
Firebase Auth's own SDK already persists the session (`firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)`, the default) — this is the "lưu cookies để lần sau vô luôn" behavior the owner asked for, achieved correctly through Firebase's own session persistence rather than a custom cookie/localStorage mechanism. No extra code needed beyond confirming persistence mode is `LOCAL` (survives browser restarts), not `SESSION` (cleared on tab close).

### 10.3 Signup success popup with animated sticker (Requirement 3)
After a successful `createUserWithEmailAndPassword` call (or successful Google sign-up), show a `.glass-panel` modal before redirecting to `index.html`:
- Headline: "🎉 Tạo tài khoản thành công!"
- Subtext: "Chào mừng đến với English Kha Master — chúc bạn học vui vẻ!"
- An animated sticker: use a small Lottie animation (celebration/confetti character) via the lightweight `@lottiefiles/lottie-player` web component loaded from `cdnjs.cloudflare.com` (per the allowed-CDN list), or — if keeping fully dependency-free is preferred — a CSS-only bouncing mascot/emoji burst (e.g. a large 🎉 or 🥳 with a `bounce-in` keyframe plus 6–8 small emoji confetti pieces animated with randomized fall/rotate, similar to the quiz-completion confetti already planned in the original brief). Reuse whichever confetti approach ends up implemented for quiz completion (original brief's Section 3) so there's only one confetti system in the codebase, not two.
- One button: "Bắt đầu học ngay" → proceeds to grade/level selection (Section 10.5/10.6).

### 10.4 Login welcome-back popup with animated sticker (Requirement 4)
Same modal pattern as 10.3, triggered after successful `signInWithEmailAndPassword` / Google sign-in:
- Headline: "👋 Chào mừng trở lại!"
- Subtext: pull the user's first name from their Firestore profile: "Rất vui được gặp lại, {name}!" — and optionally surface their current streak here if it's already meaningful ("Bạn đang giữ streak {n} ngày 🔥") since this is a natural, low-effort moment to reinforce the streak mechanic.
- Different sticker/animation from signup (e.g. a waving mascot vs. a celebrating one) so the two moments feel distinct.
- Button: "Vào học tiếp" → if the user has a `grade`/`ieltsLevel` already set, skip the level-selection screen and go straight to their last-active level's dashboard; if not yet set (first login after an account created some other way), send them to grade/level selection.

### 10.5 Elementary track: Grade 1–5 selection → 4-skill cards (Requirement 5)
New screen (or new state within `index.html`), reachable after auth for any user in the "Tiểu học" track:
- **Grade selection:** 5 `.glass-panel` cards in a row/grid, labeled "Lớp 1" through "Lớp 5" (icon or simple illustration per grade — see 10.8 on imagery). Tapping a grade sets `users/{uid}.grade` and navigates to that grade's skill screen.
- **Skill screen (per grade):** 4 cards: **Reading, Listening, Writing, Speaking.** Each card shows lesson count available at that grade for that skill (`lessons_tieuhoc` filtered by `grade` + `skill`).
- **Skills not yet built:** per the product owner's explicit instruction, Writing and Speaking (or any skill without real content yet) should still render as a card, but tapping it opens a small toast/modal: *"Kỹ năng này đang trong quá trình hoàn thiện — hãy thử luyện các kỹ năng khác trước nhé!"* rather than a broken or empty page. This keeps the full 4-skill structure visible (so the product looks complete and sets expectations for what's coming) without shipping broken functionality.

### 10.6 IELTS track: CEFR band selection → 4-skill cards, with real past-paper content (Requirement 6)
Same card-based pattern as 10.5, but for the IELTS track:
- **Level selection:** 6 cards — **A1, A2, B1, B2, C1, C2** — each subtitled with its IELTS band range exactly as given by the product owner:
  | Card | Subtitle |
  |---|---|
  | A1 — Sơ cấp | IELTS 1.0 – 2.5 |
  | A2 — Cơ bản | IELTS 3.0 – 3.5 |
  | B1 — Trung cấp | IELTS 4.0 – 5.0 |
  | B2 — Trung cao cấp | IELTS 5.5 – 6.5 |
  | C1 — Cao cấp | IELTS 7.0 – 8.0 |
  | C2 — Thành thạo | IELTS 8.5 – 9.0 |
- **Skill screen (per level):** same 4 cards (Reading/Listening/Writing/Speaking) with the same "in progress" fallback behavior as 10.5 for any skill not yet populated.
- **Seeding real past-exam content:** the product owner asked for a batch of well-known IELTS practice tests with publicly available answers/explanations to be pre-loaded. **Important copyright caveat:** official Cambridge IELTS Practice Test books and most other widely circulated IELTS materials are commercially copyrighted — the full text of reading passages, listening scripts, or writing prompts cannot legally be copied verbatim into this app's database, even if answer keys for them are freely discussed online. Recommended approach instead of direct copying:
  1. Use the AI lesson-generation pipeline already built (`/api/generate-lesson`) to generate **original** reading passages, listening-style scripts, and quiz questions that match the style, topic range, and difficulty of each CEFR band — this sidesteps the copyright issue entirely while still giving learners level-appropriate practice.
  2. Where the product owner specifically wants recognizable, "famous" practice material, link out (via `sourceLabel` / an external reference link, not by copying the text) to legitimate free/official sources — e.g. the British Council's and IDP's own free sample tests, which are intentionally published for public practice use — rather than reproducing copyrighted third-party test-book content inside the app's own database.
  3. Store the origin as metadata only (`sourceLabel: "Phong cách đề thi IELTS Cambridge"` type labels, not literal reproductions) so learners understand the practice style without the app hosting copyrighted text directly.

### 10.7 Admin content tool with AI assist (Requirement 7)
New admin console screen: **"Thêm bài học vào thẻ."**
- Form fields: track (Tiểu học / IELTS), then grade (1–5) or level (A1–C2) depending on track, then skill (Reading/Listening/Writing/Speaking).
- Two content paths, both landing in the same `lessons_tieuhoc`/`lessons_ielts` collections with `authorType: "admin"`:
  - **Manual:** admin types/pastes the lesson content, vocab list, and quiz directly.
  - **AI-assisted (the "tích hợp AI phụ tôi" request):** admin pastes source material or just a topic prompt ("bài đọc về môi trường, trình độ B1"), and the same `/api/generate-lesson` backend is called (reusing the existing, already-secured endpoint — no new AI integration needed) with the grade/level/skill baked into the prompt so the output matches CEFR-appropriate vocabulary and sentence complexity. The generated draft is shown to the admin for review/edit before publishing — **admin-authored content should always have a human review step**, since this is exactly the "content quality" gap flagged in Section 5.3 of the original audit, and it's cheap to add a review step at the one point (admin creation) where a human is already in the loop.
- List/manage view: existing lessons filterable by track/grade-or-level/skill, with edit and delete actions (already covered by the `isAdmin()` Firestore Rule in Section 8.3).

### 10.8 Illustrative imagery per lesson (Requirement 8)
To make lesson cards and lesson content more engaging:
- **Card thumbnails:** each grade/level card (10.5/10.6) and each lesson card should show a relevant image, not just a text label — e.g. a simple themed illustration for "Lớp 1," a UK/Australia landmark motif for higher IELTS bands, or a topic-relevant photo for a specific lesson (a rainforest photo for a B1 reading about the environment, etc.).
- **Sourcing:** do not hotlink or scrape images directly from arbitrary web search results into production content — that carries the same copyright risk as text (Section 10.6's caveat applies equally to images) and, separately, hotlinked external images can silently break if the source site removes them. Two safe options:
  1. Use a stock-image API with a clear free-use license for app content (e.g., **Unsplash API** or **Pexels API**, both offer free tiers with commercial-use-friendly licensing) — the admin content tool (10.7) can include an "insert image" step that searches one of these APIs by keyword and lets the admin pick a properly licensed image, storing just the returned image URL (which these services host long-term) rather than downloading/rehosting the file.
  2. For AI-generated lesson content specifically, consider AI image generation (already referenced elsewhere in this project's tooling as an option) to create simple, on-brand illustrations instead of sourcing external photos — this avoids licensing questions entirely and can match the liquid-glass visual style, though at added Gemini/image-generation API cost per lesson.
- Whichever path is chosen, always store `imageUrl` as a field on the lesson document (already reflected in the 10.1 schema) rather than embedding images as base64 blobs in Firestore documents, to keep documents small and fast to read.

### 10.9 Leaderboard focused on time + activity, not just quiz scores (Requirement 9)
New "Bảng xếp hạng" screen/tab, per the product owner's explicit emphasis on **time spent and activity**, not just correctness:
- **Columns:** display name, total time online (`stats.totalOnlineSeconds`, formatted as hours/minutes), attendance (count of unique days in `stats.attendanceDates`, i.e. "điểm danh"), lessons/exercises completed (`stats.lessonsCompleted`).
- **Ranking logic:** since the owner's stated priority is time-on-app and consistency rather than raw quiz score, default sort should be a composite (e.g., weighted by attendance streak first, then total time, then lessons completed) rather than sorting purely by XP — this avoids the common gamification failure mode where a leaderboard sorted only by "points" rewards guessing/spamming quizzes over genuine study time.
- **Tracking `totalOnlineSeconds` client-side:** increment a counter while the tab is visible and the user is authenticated (using the Page Visibility API to pause counting when the tab is backgrounded — `document.visibilityState`), flushing the accumulated delta to Firestore periodically (e.g., every 60 seconds or on page unload via `navigator.sendBeacon`) rather than writing to Firestore every second, to avoid excessive writes/cost.
- **Attendance:** on each session start, if today's date (`yyyy-mm-dd`) isn't already in `stats.attendanceDates`, append it — this is a simple, low-cost way to track daily check-ins without needing a separate scheduled Cloud Function.
- **Privacy note:** confirm with the product owner whether the leaderboard shows real names or should default to first-name-only / a chosen nickname, especially relevant again for the elementary-school track's likely under-13 users (ties back to Section 5.8's data-protection note).

### 10.10 Floating AI chat widget + direct line to Admin (Requirement 10)
Two related but distinct pieces:

**A. Floating AI chat widget (Gemini-powered, 24/7):**
- A small floating button (bottom-right corner, above/beside the existing feedback FAB — don't let them overlap; consider merging both into one expandable action button with two options: "💬 Hỏi AI" and "📩 Liên hệ Admin," to avoid cluttering the corner with two separate floating buttons).
- Expands into a compact chat panel (`.glass-panel` styled, consistent with Section 4). Auto-collapses/minimizes itself if the conversation grows long enough that it would cover meaningful content the user is actively working with — e.g., collapse to just the icon after N messages or after M minutes idle, and let the user manually re-expand it. This directly addresses the product owner's concern about the chat covering content or blocking the user from reading/completing an exercise.
- Backend: a new lightweight serverless endpoint, e.g. `/api/ai-chat`, following the exact same secure pattern as `/api/generate-lesson` (Gemini key stays server-side, never in client JS) — do not reuse `/api/generate-lesson` itself for this, since chat and lesson-generation have different prompt shapes, response formats, and (likely) different rate-limit needs. Store chat history in `chats/{uid}/messages/` per the 10.1 schema, both so users see their own history on return and so administrators (10.10B) can review AI chat logs if a user reports a problem.

**B. Direct line to Admin (human), separate from the AI:**
- A "Liên hệ Admin V.Kha" entry point on the landing/home area — per the owner's request, this should feel distinct from the AI chat, not just another AI conversation, since the value proposition here is a real person responding.
- Messages sent through this path write to the same `chats/{uid}/messages/` collection (or a clearly flagged `channel: "admin"` field vs. `channel: "ai"` on each message, if kept in one collection) so the admin console (10.7's console, or a new "Tin nhắn học viên" tab within it) shows an inbox of conversations, most-recently-active first, with an unread indicator (`readByAdmin: false`) per conversation.
- Admin replies from that inbox write back to the same thread with `from: "admin"`; the learner sees it appear in their own chat panel like a normal 1-on-1 message, fulfilling the "tôi cũng sẽ phản hồi như cách nhắn tin 1-1 cho học sinh" requirement.
- This is a natural extension of the feedback-FAB mechanism already built into the project (per the original README's existing `feedback` collection) — rather than building an entirely separate messaging system, consider whether `feedback` and this new admin-chat channel should actually be the same underlying mechanism with a `type: "quick_feedback" | "conversation"` distinction, to avoid the admin console ending up with two separate, overlapping inboxes to check.

### 10.11 Suggested build order for this section
1. Data model migration (10.1) — do this before any UI work in this section, since every screen below depends on it.
2. Auth-first redirect + welcome/signup popups (10.2–10.4) — smallest, most self-contained change, good first win.
3. Grade/level selection + skill cards for both tracks (10.5–10.6), including the "in progress" fallback state for unbuilt skills.
4. Admin content tool with AI assist (10.7) — needed before real content exists to populate the cards built in step 3.
5. Imagery sourcing (10.8) — layer onto the admin tool from step 4 and the cards from step 3.
6. Leaderboard + activity tracking (10.9) — depends on `stats` fields being written somewhere, which only starts happening meaningfully once steps 3–4 give users something to do.
7. AI chat + Admin inbox (10.10) — largest net-new backend surface (new endpoint, new collection, new admin inbox UI); do last within this section since it's the most independent of the others.

---

## 11. Single-Page URL Routing Engine & Asynchronous Deep-Linking
Deep-linking and client-side history navigation allows users to share direct links to any lesson, CEFR level, elementary grade, or learning subtab.

### 11.1 URL Structure & Route Table
| Route Format | Behavior |
|---|---|
| `#/lesson/:id` | Opens the target lesson modal immediately |
| `#/lesson/:id/:tab` | Opens the lesson modal and switches directly to `:tab` (`summary`, `vocab`, `flashcard`, `quiz`) |
| `#/ielts/:band` | Selects IELTS track, sets CEFR level (`A1`–`C2`), and updates skill grid |
| `#/ielts/:band/:skill` | Selects IELTS level and filters lesson list to the specified skill (`reading`, `listening`, etc.) |
| `#/tieuhoc/lop:grade` | Selects Elementary track, sets Grade 1–5, and loads that grade's curriculum |
| `#/tieuhoc/lop:grade/:skill` | Filters Elementary track to the specific grade and skill |
| `#/chat` | Expands the floating AI Assistant chat window |
| `#/leaderboard`, `#/explore`, `#/profile`, `#/mylessons` | Switches to the corresponding SPA app-view |

### 11.2 Asynchronous Pending Queue
Because Firestore loads lesson collections asynchronously, incoming links with `#/lesson/:id` may execute before the lessons array is populated.
- An internal `pendingRoute` queue retains the target route.
- As soon as the first Firestore `onSnapshot` returns data, the queued modal is dispatched and opened automatically without error.

### 11.3 1-Click Share Button
- A prominent "Chia sẻ bài học" button inside `#lessonModal` copies the canonical deep link (`window.location.origin + window.location.pathname + '#/lesson/' + id`) to the clipboard via the Clipboard API with fallback prompts.

---

## 12. Password Security, Live Strength Meter & Force Password Reset Flow
Fulfills the security standards outlined in Section 2.5, 3.2, and 5.7 regarding credential protection and user account security.

### 12.1 Live Password Strength Meter (Section 5.7)
Evaluates credentials in real time across four distinct tiers:
1. **Weak (Đỏ):** Less than 6 characters or single-character class.
2. **Fair (Cam):** 6+ characters with alphanumeric combination.
3. **Good (Xanh dương):** 8+ characters combining uppercase, lowercase, and numbers.
4. **Strong (Xanh lá):** 8+ characters with uppercase, lowercase, numbers, and special symbols.
Visible dynamically in both `#forcePasswordModal` and `#view-profile`.

### 12.2 Force Password Change Modal (Lockout Gate)
When an administrator generates a temporary password or sets `forcePasswordChange: true` in Firestore:
- The UI presents a modal with a heavy backdrop filter (`backdrop-filter: blur(16px)`) that prevents closing or dismissal until the password is changed.
- Validates password length, confirmation equality, and minimum strength threshold before committing to Firebase Authentication (`updatePassword`) and resetting `forcePasswordChange: false` in Firestore.

### 12.3 Self-Service Profile Security Settings
Inside the Learner Profile view:
- Displays account authentication provider badge (Google OAuth vs. Email/Password).
- Allows voluntary password updates with real-time confirmation matching and strength scoring.

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

## 8. Critical Review & Plan Refinements

### 8.1 Missing prerequisite: Real Firebase project configuration
The plan must specify where the real Firebase project config comes from. A placeholder or dummy config will cause real authentication calls to fail. In production:
- Create a project on the [Firebase Console](https://console.firebase.google.com).
- Enable **Email/Password** and **Google** sign-in methods under **Authentication > Sign-in method**.
- Enable **Firestore Database** in production mode.
- Embed the actual public Web SDK configuration into the application or initialize it cleanly as constants.

### 8.2 Missing prerequisite: How the first admin user is bootstrapped
1. Sign up normally through the app's real registration flow (Firebase Auth) to create your own account.
2. Go to the Firebase Console → Firestore Database → `users` collection → find your document (by your `uid`).
3. Manually edit that document and set the field `role: "admin"`.
4. Only after this manual step will your account pass the admin check in `admin.js` / Firestore Rules. Document this as a required manual step in the plan's verification checklist — it is not something the AI agent can or should automate, since automating it would recreate the same self-promotion vulnerability being fixed.

### 8.3 Missing scope: Firestore Security Rules must be part of this change
Client-side role checks inside `admin.js` only hide UI elements; real enforcement happens in Firestore Security Rules, which run on Google's servers and cannot be bypassed from the client.

A dedicated [`firestore.rules`](file:///c:/Users/Admin/Downloads/web%20engs/firestore.rules) file must be added to the project repository:

```javascript
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
      allow create: if true; // feedback can be submitted without login
      allow read, delete: if isAdmin();
    }

    match /system/{docId} {
      // Single maintenance mode document
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

### 8.4 Ambiguous step: How local preview should run
Local testing of serverless functions like `api/generate-lesson.js` requires the Vercel CLI:
```bash
npm install -g vercel
vercel login
vercel link        # links folder to Vercel project
vercel env pull    # pulls GEMINI_API_KEY into local .env
vercel dev         # runs static frontend AND /api serverless functions
```
Ensure `GEMINI_API_KEY` is configured in the real Vercel project's Environment Variables (Project Settings → Environment Variables on vercel.com).

### 8.5 Scope risk: Split implementation passes
- **Pass A (Security-Critical)**: Remove plaintext auth + demo users, remove client-side Gemini key path, wire real Firebase Auth (`onAuthStateChanged`), remove admin PIN, add Firestore Security Rules, document bootstrap of first admin (8.2).
- **Pass B (Feature Additions)**: Firestore sync for lessons/XP/streak/badges, Spaced Repetition buckets, "report lesson" action, empty states, liquid-glass UI, branding.

### 8.6 Note on existing test data
Existing local storage test data will be lost by design. This is intentional: legacy plaintext password records were insecure and should not carry over. Users will sign up fresh via Firebase Authentication.

### 8.7 Purpose of web-engs-deploy.zip
`web-engs-deploy.zip` is a portable deployment archive for drag-and-drop hosts like Netlify Drop. It must always be kept strictly in sync with git commits to prevent version drift.

### 8.8 Verification Checklist
- [x] Firebase project created, Email/Password + Google providers enabled.
- [x] `firestore.rules` written and saved to repository.
- [x] First admin account manual bootstrap instructions documented (8.2).
- [x] Zero references to `english_master_gemini_key` or plaintext `english_master_users_v2` in shipping code.
- [x] Access to `admin.html` without admin role confirmed rejected.
- [x] `web-engs-deploy.zip` updated with all latest fixes.


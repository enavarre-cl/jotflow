# Best Practices — TypeScript / JavaScript / CSS & VS Code Extensions

> Development standard for **Jotflow**. An exhaustive catalogue of rules with
> correct (✓) / incorrect (✗) examples. Each rule is actionable and verifiable in review.
>
> **Synthesized sources:** TypeScript Handbook (*Do's & Don'ts*), MDN (*JS Code Style*,
> *Organizing CSS*), andredesousa (*typescript-best-practices*, *css-best-practices*),
> stevekwan (*JS best-practices*), Snyk (*Modern VS Code Extension Development*), W3Schools.
> Adapted to this project: VS Code extension, Node host + webview **both TypeScript bundled with
> esbuild**, host TS `strict`, i18n.
>
> Convention: English is the source language of the **code**; examples are in English.
> Related: [ARCHITECTURE.md](ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md),
> [SECURITY.md](SECURITY.md).

**Index** — A.[Naming](#a-naming) · B.[Variables](#b-variables-and-declaration) ·
C.[TS types](#c-typescript--type-system) · D.[TS declarations](#d-typescript--declarations-handbook) ·
E.[Functions](#e-functions) · F.[Functional/immutability](#f-functional-programming-and-immutability) ·
G.[Control flow](#g-control-flow) · H.[Modern syntax](#h-syntax-and-operators) ·
I.[Objects and arrays](#i-objects-and-arrays) · J.[Comments](#j-comments) ·
K.[Async](#k-async--promises) · L.[Errors](#l-errors) · M.[Modules/size](#m-modules-organization-and-size) ·
N.[Views/webview](#n-views--webview) · O.[CSS names](#o-css--methodology-and-names) ·
P.[CSS selectors](#p-css--selectors-and-specificity) · Q.[CSS values](#q-css--values-and-units) ·
R.[CSS organization](#r-css--organization-and-build) · S.[Performance](#s-performance) ·
T.[VS Code extensions](#t-vs-code-extensions) · U.[Security](#u-security) ·
V.[Testing](#v-testing) · W.[Tooling/repo](#w-tooling-build-and-repo-hygiene) ·
X.[Checklist](#x-pre-commit-checklist).

---

## A. Naming

**A1.** **Descriptive and pronounceable** names; measure them by what they explain, not what they
save. `elapsedDays`, not `d`/`x1`/`fe2`.
**A2.** **`camelCase`** variables/functions · **`PascalCase`** types/classes/interfaces ·
**`UPPER_SNAKE`** module constants.
**A3.** **Booleans prefixed** with `is`/`has`/`should`/`can`: `isLoading`, `hasApiKey`, `canRetry`.
**A4.** **No Hungarian notation** or type suffixes: `name`, not `nameStr`; `users`, not `userArray`.
**A5.** **Collections plural**: `cars`, not `carList`.
**A6.** **Names of 3–10 chars**, semantic and from the real domain; avoid possessives (`myCar`).
**A7.** **No magic numbers/strings**: name them. `const MAX_RETRIES = 3`.
**A8.** **Always English** (the source language of the code).

## B. Variables and declaration

**B1.** **`const` by default**, `let` only if you reassign, **never `var`** (function scope, mutable).
**B2.** **One variable per line**; don't chain `let a, b, c`.
**B3.** **Initialize on declaration**; avoid `undefined` states.
**B4.** **Parameter defaults** for optionals: `function log(msg = '') {}`.
**B5.** **Declare near first use** (not "everything at the top," but group what's related).

## C. TypeScript — type system

**C1.** **`strict` on** and never loosened per file: includes `noImplicitAny`, `strictNullChecks`,
`noImplicitReturns`, `forceConsistentCasingInFileNames`.
**C2.** **`any` is debt → use `unknown` + narrowing.** `any` turns off all checking.
```ts
function h(x: any) { x.foo(); }                       // ✗
function h(x: unknown) { if (typeof x === 'string') x.toLowerCase(); }  // ✓
```
**C3.** Only tolerated `any`: **dynamic JSON from external APIs**, isolated in the parse/adapter layer.
**C4.** **Type boundaries, infer internals**: annotate parameters, public returns and interfaces; not
locals TS deduces.
**C5.** **Literal unions** for closed sets: `type Status = 'pending' | 'approved'`.
A single source of truth that also generates the type guard.
**C6.** **Discriminated unions** with a literal field (`kind`/`type`): `{ kind:'text'; text } | { kind:'image'; url }`.
**C7.** **`readonly` by default** on the immutable; `readonly T[]` on unmodified parameters.
**C8.** **Utility types** instead of duplicating: `Partial`, `Readonly`, `Pick`, `Omit`, `Record`.
**C9.** **`interface` for shapes/contracts**, **`type` for unions/tuples/aliases**.
**C10.** Don't fragment interfaces aggressively if it obscures the structure.

## D. TypeScript — declarations (Handbook)

**D1.** **Lowercase primitives**, never boxed: `string`/`number`/`boolean`, not `String`/`Number`.
Use `object`, not `Object`.
**D2.** **Generics that use their parameter**; a `<T>` not appearing in the signature infers nothing.
**D3.** **Ignored callbacks → `void` return** (not `any`): prevents accidentally using the value.
**D4.** **Don't make optional the parameters of a callback** that will always receive a value.
**D5.** **Don't multiply overloads by callback arity**: declare the max arity once.
**D6.** **Optional parameters instead of overloads that only add a tail**:
`diff(a: string, b?: string)`, not three signatures.
**D7.** **Unions instead of overloads differing in one type**: `utcOffset(b: number | string)`.
**D8.** **Order overloads specific → general** (TS takes the first that fits).

## E. Functions

**E1.** **Small and single-responsibility** (~5–15 lines); if the name needs an "and," it's two.
**E2.** **≤3 parameters**; more → an options object: `createUser(opts)`.
**E3.** **No boolean flag** that branches the body → split into `getUser` / `getUserWithProfile`.
**E4.** **Little nesting**: *early return*, extract sub-functions; no pyramids of `if`.
**E5.** **Function declaration** over an expression assigned to `const` for named functions.
**E6.** **Arrow for callbacks** (no own `this`); **implicit return** if it's an expression:
`list.map(x => x.id)`.

## F. Functional programming and immutability

**F1.** **Prefer pure functions**: output determined only by input, no side effects.
**F2.** **Immutability over shared state**: create new, don't mutate.
```ts
arr.push(x);                 // ✗ if arr is shared
const next = [...arr, x];    // ✓     const upd = { ...user, age: 41 };
```
(Mutating a local array you created is correct and faster — the rule is for shared state.)
**F3.** **Centralize effects** (I/O, network, DOM, global state); keep the rest pure.
**F4.** **Avoid global state**; inject dependencies by argument, no hidden singletons.
**F5.** **Array methods** (`map`/`filter`/`reduce`) over loops when readability wins.
**F6.** **Replace complex conditionals** with polymorphism / strategy when they repeat.
**F7.** **Iterators/generators** for streaming data or lazy evaluation.

## G. Control flow

**G1.** **`switch`: `return` per case** (no `break`), **`default` last**, **braces `{}`** if
you declare variables in a case.
**G2.** **Always include `default`** in a `switch` to catch unexpected values.
**G3.** **No `else` after `return`**: flatten the happy path.
**G4.** **Ternary for simple assignment**: `const x = cond ? 1 : 2`.
**G5.** **Always braces** in control flow, even with a single statement.

## H. Syntax and operators

**H1.** **`===`/`!==` always** (documented exception: `== null` with a comment).
**H2.** **Boolean shorthand** `if (x)` / `if (!x)`, not `if (x === true)`.
**H3.** **Template literals**, not concatenation: `` `Hi ${name}` ``.
**H4.** **Destructuring and spread**: `const { id } = user`, `const [a, ...rest] = list`.
**H5.** **Explicit conversion**: `String(v)` / `Number(v)`, not `'' + v` or `+v`.
**H6.** **No `eval`, `with`, `void` as an operator** nor modifying native prototypes
(`Array.prototype`, `Object`, `Date`…).

## I. Objects and arrays

**I1.** **Literals, not constructors**: `[]` / `{}`, not `new Array()` / `new Object()`.
**I2.** **`push()` to append**, not `arr[arr.length] = x`.
**I3.** **Object shorthand**: `return { name, age }`; **short method**: `{ foo() {} }`.
**I4.** **ES `class`** for object types with behavior.
**I5.** **`Object.hasOwn(o, k)`**, not `o.hasOwnProperty(k)` (deprecated).
**I6.** **`for...of` / `forEach`** over `for (;;)` unless a measured hot path; **never `for...in`** over
arrays/strings. `const` in `for...of`, `let` in indexed loops.

## J. Comments

**J1.** **Comment intent and the "why"**, not the obvious that the code already says.
**J2.** **No commented-out code**: that's what git is for; delete it.
**J3.** **Only the comments you need** ("as much as needed, not more").
**J4.** **JSDoc on the public API** (parameters, return, throws) when it adds value.

## K. Async / promises

**K1.** **`async`/`await`** over callbacks and chained `.then()`.
**K2.** **No floating promise** (`@typescript-eslint/no-floating-promises` at `error`): `await`
or explicit `void`.
**K3.** **Parallelize the independent** with `Promise.all`; sequential only if there's a dependency.
**K4.** **Every long operation accepts and respects `AbortSignal`** (fetch, streaming, loops). The
`LLMProvider.chat` contract (`cb.signal`).
**K5.** **Stream by chunks** (`for await`), without accumulating everything in memory.
**K6.** **Timeout on all network I/O**: without it, a call hangs the UI indefinitely.

## L. Errors

**L1.** **Throw `Error` (or a subclass), never strings or plain objects**: without a stack there's no
diagnosis. `throw new Error('parse failed: ' + path)`.
**L2.** **Don't swallow exceptions**: an empty `catch {}` only with a comment that justifies it; at
minimum, log. **Omit the binding** if you don't use it: `catch { … }`.
**L3.** **Expected vs bug**: network/invalid key → actionable message; `TypeError` → your bug, don't
disguise it as a friendly toast.
**L4.** **Validate at the boundary** (user, disk, network, webview messages) before propagating to the
typed core.
**L5.** **Centralize formatting** (one HTTP-error helper), not ad-hoc copied `try/catch`.

## M. Modules, organization and size

> Origin of the invariant: **3 god-files of ~2000 lines** cost hours of de-modularization.

**M1.** **Hard ceiling: no file >500 lines** (TS, JS **and CSS**).
**M2.** **Real target ~200–300**; at 400+ plan the split.
**M3.** **One file = one reason to change** (high cohesion, low coupling).
**M4.** Split signals: a name with "and"; thematically distinct imports; related functions separated
by scrolling; recurring merge conflicts; hard to test because it mixes I/O and logic.
**M5.** **Split while writing, not at the end** (a late split is an expensive refactor).
**M6.** **Export the minimum**; what isn't imported elsewhere isn't exported; what isn't imported is deleted.
**M7.** **No circular dependencies**: if A↔B, a layer is missing.
**M8.** **Group and clean imports** (stable order, no dead imports — the linter flags it).
**M9.** **Don't mix technologies**: HTML/CSS/JS separate, no styles or markup embedded in JS.
**M10.** **Move to configuration** what changes often (config objects, translations).

## N. Views / webview

Every view or panel is a **closed module**, not a monolithic script. Pieces, each in its own file:

| Piece        | Responsibility                        | Doesn't do                       |
|--------------|---------------------------------------|----------------------------------|
| **render**   | DOM ← state (`state → nodes`, pure)   | No fetch, no state mutation      |
| **store**    | The view's data and transitions       | Doesn't touch the DOM            |
| **events**   | Listeners → actions on the store      | Doesn't render directly          |
| **protocol** | The view's host↔webview messages      | No presentation logic            |
| **styles**   | The view's CSS, isolated              | Doesn't define global styles     |

**N1.** **One view = one folder/prefix**; not mixed with another view.
**N2.** **The controller only orchestrates** (wires render+events+protocol); zero business logic.
**N3.** **No global state shared between views**: each one with its store; the common is injected.
**N4.** **Extract the reusable component** (button, list, spinner) as soon as the 2nd copy appears.
**N5.** **The webview has no FS or network of its own**: it asks the host via `postMessage` (a security design).
**N6.** **Explicit message contract**: `type` + known payload; dispatch in one router, not giant
`switch`es duplicated on both sides.
**N7.** **Real ES modules** (`import`/`export`), never globals hanging off `window`; namespace the
unavoidable (`const App = App || {}`).
**N8.** The webview is **TypeScript** (`src/webview/**`), bundled by esbuild (`scripts/build-webview.ts`)
to `media/dist/` (served to the webview). Type net: **`npm run typecheck:webview`** (`tsc -p
src/webview/tsconfig.json`) after every change (a gate separate from the build).
**N9.** **Distinguish entry-point from module by convention** (`*.entry.js` or an `app/` folder), not by
leaving two same-named files in different folders.

## O. CSS — methodology and names

**O1.** **Adopt a methodology** and be consistent: BEM (recommended), or ITCSS/OOCSS/SMACSS.
**O2.** **BEM**: `block`, `block__element`, `block--modifier`. E.g. `.card`, `.card__title`, `.card--featured`.
**O3.** **OOCSS**: separate structure from skin; **multiple classes** per element (`class="box warning"`).
**O4.** **Descriptive names by purpose**, not generic (`.board`, `.user` → accidental reuse).
**O5.** **Don't concatenate names** with the preprocessor's `&-foo` (it hides the real selector from search).
**O6.** **Group styles by subject** (the element), not by context: all buttons together, not scattered
across components.

## P. CSS — selectors and specificity

**P1.** **Zero IDs in selectors** for elements that are **reusable or styled by context** (high
specificity that triggers cascade wars). **Bounded exception:** a document **singleton** (a single
`#messages`, `#sendBtn`, `#notices`) may be styled by its `id` — the reason for the rule (avoid
specificity wars and accidental reuse) doesn't apply to a unique element. Every **new view/component**
uses **classes** (the `engines`/`voices` panels already do).
**P2.** **Zero inline styles** (`style="…"`): they mix content and presentation.
**P3.** **No qualified selectors**: `.nav`, not `ul.nav`.
**P4.** **No long/unnecessary chains**: `.someclass li`, not `body #wrap .someclass ul li`.
**P5.** **Avoid dangerous/generic selectors** (`div {}` with specific properties) that leak styles.
**P6.** **Each key selector once** (single source of truth); don't spread `.btn` across several rules.
**P7.** **Nesting ≤3 levels** in a preprocessor.
**P8.** **`!important` only proactively** (a deliberately global rule, e.g. errors in red),
**never reactively** to win specificity.

## Q. CSS — values and units

**Q1.** **Relative units** (`rem`, `em`, `%`, `vw/vh`, `fr`) over fixed `px`/`pt`.
**Q2.** **No hard-coded values**: `line-height: 1.333`, not `32px`.
**Q3.** **No magic numbers or brute-forcing** (`margin-left: -3px` by eye = misunderstood box model).
**Q4.** **CSS variables** (`--color-accent`) for theming/reuse; in an editor inherit VS Code's
*theme tokens* (`var(--vscode-…)`).
**Q5.** **Hex over color names**; name color variables for readability.
**Q6.** **Longhand over shorthand** when the shorthand would reset properties you didn't mean to touch.
**Q7.** **Content defines the size** (`padding`/`max-width`), not fixed dimensions.
**Q8.** **The parent controls the child's position** (margins/positioning outside the component) →
reusable.
**Q9.** **Distinguish block vs inline** when styling; **keep the HTML semantics** (don't alter markup
just for style).
**Q10.** **Don't undo styles**: add progressively; if you must remove, restructure the selector.

## R. CSS — organization and build

**R1.** **One property per line**; **group selectors** that share rules with a comma
(`h1, h2, h3 { … }`).
**R2.** **Consistent property order** (alphabetical or other, via linter).
**R3.** **Commented logical sections**, order general → utilities → layout/sitewide →
components; searchable markers (`/* || Header */`).
**R4.** **Comment non-obvious decisions** (fallbacks, temporary hacks).
**R5.** **Modularize by view/feature** (several small files), load only what's needed.
**R6.** **Separate global vs local**; **components with encapsulated style**.
**R7.** **Remove dead CSS** (PurgeCSS/UnCSS); **minify** in the build (cssnano).
**R8.** **Autoprefixer + Browserslist** for compatibility; **stylelint** for consistency.
**R9.** **Few fonts**: each WebFont delays render; optimize its loading.
**R10.** **Media queries with descriptive variables** (`$medium: 768px`).

## S. Performance

**S1.** **Focus on the big stuff**: DOM reflows, frequent events, HTTP requests — not
micro-optimizing the invisible.
**S2.** **Minimize DOM access**: cache queries, batch updates (the DOM is expensive).
**S3.** **Lazy-loading / code-splitting** at logical points; reduce the initial bundle.
**S4.** **Compress (gzip/brotli) and minify** in production.
**S5.** **Web Workers** for heavy tasks that would block the UI.
**S6.** **Feature detection over browser detection**; no browser-specific code.

## T. VS Code extensions

**T1.** Layout: all source under `src/` split by runtime — `src/host/` (Node; entry
`src/host/extension.ts`), `src/webview/` (sandbox), `src/shared/` (pure). `media/` holds only
assets served to the webview (CSS, images, `dict/`, and the generated `dist/` — which includes the
`mermaid` UMD copied from its npm devDep; zero committed `.js`). Plus `package.json` (manifest),
`tsconfig.json`, `.vscode/{launch,tasks}.json`.
**T2.** **`@types/vscode`** for types (the `vscode` package is deprecated). Pin it to `engines.vscode`
(the minimum VS Code you support) — not floating to latest, or `vsce package` fails.
**T3.** `activate(context)` on trigger; `deactivate()` for cleanup.
**T4.** **Lazy activation**: trigger on a concrete contribution (command, language, view), **not**
at editor startup; minimal `activationEvents`.
**T5.** **Contribution points** declare how capabilities are invoked (commands, menus, views,
settings).
**T6.** **`package.json` ↔ code ↔ nls in sync**: every command declared in `contributes.commands`
and registered; every `%key%` in **all** `package.nls.<lang>` bundles (orphan = literal).
**T7.** After touching `package.json` (commands/menus/views), **reload the dev host (⌘R)**.
**T8.** **Every disposable to `context.subscriptions`** (commands, panels, watchers, processes): a
leak is a leak in the user's editor.
**T9.** **Child processes with explicit lifecycle** (Ollama, Piper, MCP in `*/manager.ts`): they die
with the extension.
**T10.** **i18n from day 1**: English as the key; zero hardcoded visible text.
**T11.** **Extend through the existing extension point** (factory/interface, e.g. `LLMProvider`),
not by patching the core.
**T12.** **Bundle with esbuild** (recommended by MS; minify only with `--minify`); declare dynamic
deps as static or `external`.
**T13.** **Test in the Extension Development Host** (F5) + unit tests before publishing.
**T14.** Inspect the `.vsix` with `vsce ls` before `vsce package` (respects `.vscodeignore`).

## U. Security

**U1.** **Secrets in `SecretStorage`**, never in settings or on disk (API keys via `KEY_PROVIDERS`).
**U2.** **Respect `untrustedWorkspaces`**: features with FS/exec degrade gracefully.
**U3.** **Webview with strict CSP**: `nonce` per script, no inline scripts, no `eval`.
**U4.** **Never `innerHTML` with user/model data** (XSS): use `textContent`, build DOM or
sanitize the markdown; escape names (`escapeHtml`) before interpolating.
**U5.** **Validate all external input**; beware **SSRF** and **path traversal** in tools that touch
URLs/paths.
**U6.** **Audited dependencies** (`npm audit`/Snyk); pin external binaries by hash.

> Rules U7–U11 come from real **CodeQL** findings (see §W7); each one cites its query.

**U7.** **Sanitize HTML with a DOM *allowlist*, not a regex *denylist*.** To insert potentially
untrusted HTML (READMEs, scraped content), parse it into an inert `<template>` (its content isn't
rendered and `<script>`s don't run) and keep **only** tags/attributes from a whitelist (see
`sanitizeHtml` in `src/webview/models.ts`). A `.replace()` that strips `<script>`/`on*` is
**incomplete**: a split or nested payload (`<scr<script>ipt>`) reassembles in a single pass
(CodeQL `js/incomplete-multi-character-sanitization`). If there's *truly* no alternative to regex,
do it in a **loop to a fixed point** (`do { p=s; s=s.replace(re,'') } while (s!==p)`).
**U8.** **Tolerant tag filters** (no naive single-shot). A closing tag like `</script>` must also
match `</script >` / `</script\tbar>`: use `</script[^>]*>` (CodeQL `js/bad-tag-filter`).
**U9.** **Untrusted bytes → media via `Blob` + `URL.createObjectURL`**, never via `data:` +
concatenation. Putting an attachment's `mime`/base64 into `img.src = 'data:'+mime+';base64,'+data`
sends untrusted data into a URL *sink* (CodeQL `js/xss-through-dom`, `js/client-side-unvalidated-url-redirection`).
Decode to a `Blob`, use the `blob:` the **browser generates**, validate the `mime` (`image/…`) and
**revoke** the object URL on `load`/`error` (see `setImageSrc` in `src/webview/core/dom.ts`).
**U10.** **Entity-decoding order: `&amp;` last.** Decoding `&amp;`→`&` before `&lt;`/`&gt;` produces a
double-unescape (`&amp;lt;` → `<` instead of `&lt;`) (CodeQL `js/double-escaping`).
**U11.** **No identity / no-op replacements.** `.replace(/X/g, 'X')` replaces something with itself
(CodeQL `js/identity-replacement`); to **escape** a character to a literal use the escaped sequence
(e.g. U+2028/U+2029 → `'\\u2028'`/`'\\u2029'` to embed JSON in an inline `<script>`), not the character.
**U12.** **`innerHTML` only with HTML you generate; escape every interpolation** — even "trusted"
tags (translations `t()`, names): `escapeHtml()` before concatenating (CodeQL `js/xss`).
Better still, build DOM nodes (`textContent`).

## V. Testing

**V1.** **`node:test`** on the **pure logic** (parsing, transforms, helpers): maximum return.
**V2.** **Design for testability**: what's hard to test mixes I/O and logic → extract the logic.
**V3.** **One regression test per bug** fixed.
**V4.** **Run in CI** and block the merge if it fails.
**V5.** **"Testing > shipping"**: cover every new feature; raise confidence, lower regressions.

## W. Tooling, build and repo hygiene

**W1.** **ESLint** (flat config) at `error` for what breaks (`no-floating-promises`, `no-var`,
`no-unused-vars`); pragmatic with `any` only in the external-JSON layer.
**W2.** **Prettier** for formatting (zero style debates); **stylelint** for CSS; **lint-staged**
on commits.
**W3.** **No versioned generated files or backups** (`out/`, `*-backup/`, `*.old`) except explicit
intent in `.gitignore`/`.vscodeignore`. Git is the backup; no block-commented code.
**W4.** **Ephemeral planning docs** (`plan-*.md`, `*-todo.md`) don't stay on `main`: they
become issues or are deleted.
**W5.** **`CHANGELOG.md` per release**, `version` bumped before publishing.
**W6.** **README/ARCHITECTURE reflect reality**, not aspirations.
**W7.** **GitHub CodeQL (code scanning)** runs on every push to `master`; keep its *security
queries* for JS/TS at **0 alerts** (`js/xss`, `js/xss-through-dom`, `js/client-side-unvalidated-url-redirection`,
`js/bad-tag-filter`, `js/double-escaping`, `js/incomplete-multi-character-sanitization`,
`js/identity-replacement`…). For a legitimate false positive, **refactor to the pattern CodeQL
recognizes** (DOM allowlist, `Blob` URL, guard with `RegExp.test`) before resorting to a justified
*dismiss*. Rules U7–U12 encode the findings already seen.

## X. Pre-commit checklist

```bash
npm run compile              # host: tsc → out/   (0 errors)
npm run lint                 # eslint src   (0 errors / 0 warnings)
npm run typecheck:webview    # webview: tsc -p src/webview/tsconfig.json (0 errors)
npm run build:webview        # webview: esbuild src/webview → media/dist/*.js
npm test                     # compile + node:test
```

By eye:
- [ ] Any file >500 lines (TS, JS or CSS)? → split it now.
- [ ] New view modularized (render / store / events / protocol / styles)?
- [ ] New `any` outside the external-JSON layer? → `unknown` + narrowing.
- [ ] New promise `await`ed or `void`ed? I/O with timeout and `AbortSignal`?
- [ ] `innerHTML` with model data? → `textContent`/sanitize (DOM allowlist, not regex; U7/U12).
- [ ] Untrusted HTML/URL? → no denylist regex, no `data:`+concat (use `Blob`/`createObjectURL`),
  `&amp;` decoded last, no identity `.replace` (U7–U11). CodeQL at 0 (W7)?
- [ ] CSS selector with an ID or reactive `!important`? → refactor.
- [ ] New `%nls%` in all bundles? Command declared + in disposables?
- [ ] New secret in `SecretStorage`?
- [ ] Any dead code, backup or stray plan doc left? → delete it.

> **~140 rules** across 24 sections (A–X). If a situation fits none, it's a candidate for a new
> rule: open a PR against this document.

Review complete. Ledger written to docs/SKILL_ALIGNMENT_AUDIT.md. 

 Verdict 

 11 ALIGNED · 4 DRIFT · 0 behavioral breakage. The skill is highly accurate on versions, architecture, security posture, schema, interfaces, and runnable gates. All discrepancies are documentation-accuracy 
 issues — no code defects. 

 Ground truth (live) 

 - npm test → 467 passed exactly (web 271 + db 31 + shared 70 + server 95) ✓ 
 - 4 fast CI gates (test:plan-alignment, test:gitignore, test:no-secrets, test:ci-config) → all PASS ✓ 

 4 DRIFT findings to correct in the skill 

 ┌─────┬───────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────┐ 
 │ #   │ Section               │ Issue                                                                                                                                                                │ Severity │ 
 ├─────┼───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤ 
 │ D-1 │ §21 Round-History     │ Test-count trajectory wrong: claims R6–7≈462, R8=462, R9=453 (implying a 9-test drop at R9). Authoritative (AGENTS.md):                                              │ HIGH     │ 
 │     │                       │ 428→453(R7)→453(R8)→453(R9)→462(R10)→467(R13). R9 added zero tests.                                                                                                  │          │ 
 ├─────┼───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤ 
 │ D-2 │ §4.1 Design tokens    │ Shows --color-ember-500:#f97316; --color-ember-600:#db2777 in @theme. Actual @theme defines only --font-sans; UI uses Tailwind's default orange-*/zinc-* palette.    │ MEDIUM   │ 
 │     │                       │ Tokens are fabricated.                                                                                                                                               │          │ 
 ├─────┼───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤ 
 │ D-3 │ §4.3 / §7.1           │ Claims 8 categories incl. nature. Actual: 7 (tech, art, space, sports, animals, food, gaming); nature doesn't exist. (18 communities count is correct.)              │ MEDIUM   │ 
 │     │ Categories            │                                                                                                                                                                      │          │ 
 ├─────┼───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤ 
 │ D-4 │ §6.3 / §8             │ Says hook is used in Modal.tsx and Dropdown.tsx. Real: useFocusTrap is used only in Modal.tsx; Dropdown.tsx implements its own Escape/arrow-key focus handling.      │ MEDIUM   │ 
 │     │ useFocusTrap          │                                                                                                                                                                      │          │ 
 └─────┴───────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────┘ 

 Plus I-1 (LOW, optional): §18.1 "Key Columns" tables omit a few real columns (bio, description, onlineCount, link_domain, image_category, flair) — index/PK definitions all match. 

 The ledger includes a full evidence table (file:line for every verified claim) and ready-to-apply corrections. Per your "report only" choice, I did not edit reddit-clone_SKILL.md. 

 Want me to apply the 5 corrections from the ledger to reddit-clone_SKILL.md now (surgical edits, then re-run the gates to confirm green)?

---

All five corrections are applied and verified against the source. Final state of reddit-clone_SKILL.md: 
 
Validation + Applied Edits — Summary 
 
I independently verified all 5 findings against the actual code (not trusting the audit doc), then applied surgical edits. Every change traces to a file:line ground-truth: 
 
┌─────┬───────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐ 
│ #   │ Fix                                                                                           │ Location in skill      │ Evidence                                                                       │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ D-1 │ §21 round-history Tests column: 6–7 → 453, 8 → 453, 9 → 453 (removed the false 462→453        │ §21 table (L1136–1138) │ AGENTS.md authoritative trajectory: 428(R6)→453(R7)→453(R8)→453(R9)→462(R10)   │ 
│     │ "drop")                                                                                       │                        │                                                                                │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ D-2 │ §4.1 @theme block now shows only real --font-sans token; prose notes default orange-*/zinc-*  │ §4.1 (L180–190)        │ apps/web/src/index.css L7–9: @theme defines only --font-sans                   │ 
│     │ palette                                                                                       │                        │                                                                                │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ D-3 │ §4.3 → "7 community categories" (dropped nature); §7.1 → "18 communities across 7 categories" │ §4.3 (L238), §7.1      │ communities.ts uses 7 categories; nature is an unused ImageCategory member     │ 
│     │                                                                                               │ (L360)                 │ (types/index.ts:14)                                                            │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ D-4 │ §6.3 + §8 clarify useFocusTrap is used only in Modal.tsx; Dropdown.tsx has its own            │ §6.3 (L349–350), §8    │ Modal.tsx:4,14 uses it; Dropdown.tsx:2 imports only useOnClickOutside          │ 
│     │ Escape/arrow handling                                                                         │ (L388)                 │                                                                                │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ I-1 │ §18.1 tables: added bio (users), description+online_count (communities),                      │ §18.1 (L980–982)       │ packages/db/src/schema/index.ts real columns                                   │ 
│     │ link_domain+image_category+flair (posts)                                                      │                        │                                                                                │ 
└─────┴───────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘ 
 
Verification performed: rg confirms zero residual references to the fabricated ember tokens, "8 categories", the nature, tech… list, or the old "Modal.tsx and Dropdown.tsx" focus-trap claim. The only remaining 
"ember" strings are the correct project name "embers". 
 
Impact: These are documentation-only edits to a Markdown skill file — no source code, types, or build artifacts touched. npm run typecheck, npm run lint, and npm test (467) are unaffected; none of the CI gates 
(test:plan-alignment, etc.) cover the skill file, so no gate re-run was required. 
 
The skill now accurately reflects the codebase across all 14 verification areas the audit identified.


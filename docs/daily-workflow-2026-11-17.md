# Daily workflow release — 2026-11-17

Owner authorization: implement returning-user entry, cross-plan Today and actual records, preserve the existing UI/analytics rules, verify and release. This release adds a complete local daily loop; the static Astro architecture and account/cloud boundaries remain.

## User journey

1. Returning users with schedules or history can open Today from home. Calculation-only users can open their saved setups without creating a product or automatically calculating.
2. `/today` and `/zh/today` combine saved schedules for the selected day in the selected view time zone. Plan recurrence and source time zones remain unchanged. The selected date is a half-open interval of instants, including 23/25-hour days.
3. Record opens an explicit form with planned amount and original snapshot. Save records the confirmed actual amount/time; Skip creates a skipped entry with no actual amount. Nothing is marked taken automatically.
4. Users can edit, undo/remove, or backfill an entry. A saved scheduled occurrence has one record, keyed by the tuple of plan ID, item ID and planned local date. Two different plans remain distinct.
5. History preserves both actual and original planned values, including blend amount bases. Plan/product edits and deletion do not modify it. Extra/manual or orphaned records remain visible for their actual day and in history.
6. History filters use the view time zone. CSV exports the entire filtered result, including rows beyond the first 50 displayed. CSV distinguishes skipped entries from actual usage and neutralizes spreadsheet formula prefixes.
7. JSON backup v4 includes actual records. Versions 1–3 remain readable. Restore previews record counts and requires explicit replace-all confirmation; restoring an old backup can remove actual history. Canceling and invalid imports do not modify storage.

## Data and reliability contract

- The existing localStorage key is retained. Reads never migrate or write automatically. Without actual records, exports retain the existing v1/v2/v3 selection; with records, v4 is used.
- `ActualRecord` stores status, actual values, entry instant/time zone, local notes, creation/update instants and an optional immutable scheduled snapshot. Product snapshots retain their revision, quantity, concentration and blend composition. Skipped entries have an empty actual amount.
- All mutations acquire the same origin-scoped Web Lock before reading, validating and writing the workspace. Every UI caller awaits completion before reporting success or sending conversion events. Stale record edits additionally compare `updatedAt`.
- Planned occurrence identity does not depend on label, amount, time or hyphen concatenation. Editing a plan retains a record's original context; moving/removing an item does not delete history.
- Actual times reject nonexistent DST clock times. Repeated hours require choosing the first or second occurrence unless the existing instant is already known. Future taken records are rejected.
- An invalid schedule cannot suppress valid schedules from the same day. A clock gap elsewhere in a long plan does not prevent a valid day's entries from appearing.
- View date/time zone/history filters live in this tab's sessionStorage; language changes and refresh retain the view. Today mode refreshes at midnight/on focus; manually selected historical dates stay selected.
- Unreadable data, full/disabled storage and write-lock failures do not overwrite data or claim success. Existing data remains exportable when readable. Modern browsers over HTTPS are required for safe writes.
- Limits: 10,000 actual records, 10 MB imported backup, with browser storage quota still enforced. There is no silent truncation. JSON/CSV exports are private plaintext files.

## Analytics

Existing production origin, consent, denied-with-zero-requests and QA boundaries are preserved. No labels, IDs, hashes, amounts, dates/times, time zones, notes, file names or file contents enter analytics.

| Event | Allowed parameters | Trigger |
|---|---|---|
| `page_view` | Existing generic metadata; `page_group=today` | Page entry, path normalized to `/today` for both languages |
| `navigation_action` | Existing enums plus `open_today`, `resume_calculation` | Explicit enabled navigation |
| `record_saved` | `operation=create|update`, `record_source=scheduled|manual`, `record_status=taken|skipped` | Successful explicit local write |
| `record_removed` | `record_source=scheduled|manual` | Confirmed successful removal |
| `export_completed` | Existing enums plus `export_type=csv` | File created and download initiated |

Loading, rendering, viewing history, language restoration and JSON restoration do not generate actual-record conversion events. JSON restoration retains the existing `backup_restored` event. A download request does not prove the user saved the file.

Recommended GA4 daily-use funnel: `protocol_saved` → Today page view → `record_saved` with `operation=create,record_status=taken`. Updates and skipped entries are not new actual-use records. Seven-day return analysis should use users from the first actual-record cohort who create another taken record, excluding QA and filtering hostname `peptides.ybwdaisy.com`. Consent and blocking affect coverage. Local contract tests do not establish GA4 backend reception or saved exploration configuration.

## Preservation and verification

- `npm run check`: no errors, warnings or hints.
- `npm test`: 45 passed, including cross-zone/leap/DST days, immutable snapshots, failed writes, stale edits, v4 roundtrip and blend-basis CSV.
- `npm run build` and `npm run verify:site`: 52 static pages, local links/assets/metadata and 44 public sitemap URLs. Both Today routes are noindex and excluded from sitemap.
- Full browser suite: 116 passed across installed desktop Chrome and iPhone 13 mobile WebKit emulation. Existing storage and analytics assertions were retained; async persistence tests now wait for visible write completion before inspecting storage.
- New browser coverage: calculator-only resume; two-plan record/edit/skip/undo; manual backfill and filtered CSV artifact; v4/legacy restore preview/cancel/confirm; quota failure preserving form; unreadable data preservation; stale edit rejection; explicit and default-backfill DST folds; simultaneous writes in two real tabs; midnight refresh; view/draft language retention; EN/ZH native field bounds at 320/390/641/820/1280; denied-zero-request and enum-only consented tracking, including silent restore/rerender.
- Hallmark app-scope source/render sweep: 0 FAIL, 0 open Reflex/WARN; 5 screenshots. Existing palette/long-label dismissals retain the owner's locked design. Actual Chrome/mobile WebKit screenshots of records and the Chinese editor were inspected.
- Independent review identified missing planned blend basis and the default-backfill repeated-hour path; both fixed with regressions. Follow-up verified async callers, lock release and stale-edit rejection. Error focus is restored after making the form interactive on a failed write.
- Not performed: physical iPhone installation/operation; new GA4 events observed in the backend or a saved new exploration. The local suite simulates the tag and does not send production analytics.

## Release and rollback

Use a feature PR from `codex/daily-tracking`, require CI and the Vercel preview, then merge under the owner's explicit authorization in this turn. GitHub is connected to Vercel project `peptide-tools`, production branch `main`. Production verification and identifiers are appended after deployment.

Rollback must retain the v4 parser and independent history model. A pre-release binary cannot read v4 data; it must never be used as a reason to clear browser storage. Prefer a forward fix or a UI revert that retains v4/locks. If an emergency static rollback is required, restore the v4-capable release promptly; existing v4 JSON and localStorage remain intact but old code cannot expose them. Keep JSON/CSV backup available and do not down-convert or discard records. The immediate pre-release production was source `55d17df` / deployment `dpl_2rxvC7SQ6jvSFE7393P2tShovEn3`.

Kept: all existing routes, product/calculation confirmation requirements, precise arithmetic, schedule recurrence and time-zone behavior, ICS/print semantics, old backups, explicit clear/restore confirmations, source facts, consent and no health input telemetry. Added Today navigation, local record schemas and the approved enum events only. No business backend, cloud sync, reminders, inventory deduction or dose recommendation.

Verification records and deployment identifiers are appended below after the release checks finish. Mobile WebKit is browser emulation; no physical iPhone acceptance is claimed.

## Rollback

Prefer a forward fix or a UI revert that retains the v4 parser, history, Web Lock and data-preserving writes. Releases before this one cannot read v4: do not send users to an older build and ask them to clear storage. A static deployment rollback does not roll back local data. Preserve the storage key and export v4 backup before any recovery; never silently drop actual records to produce an older backup.

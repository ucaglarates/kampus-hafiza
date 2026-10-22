# Moderation and post archive rollout — 2026-10-22

## Deployment order

Do not deploy this frontend before the database changes. It reads
`community_profiles` and calls `deactivate_post`, `review_report`,
`inspect_post_author`, and the updated `accept_legal_terms`.

1. Confirm migrations 01–06 are installed in the target Supabase project.
2. Apply 07, 08 and 09 in that order as the database administrator. For the
   first rollout, run the combined SQL artifact in one transaction.
3. Deploy the matching frontend; users will see the new legal version.
4. Test with a student, an unrelated student, a moderator and the founder.

The original SQL migrations remain unchanged. Rerun the new migrations in
order; a lower migration alone can replace a function changed by a later one.
Do not roll back only the frontend: the new private-profile RLS and API grants
intentionally reject the old broad profile queries and permanent post deletes.

## Expected behavior

- "Kaldır" sets `posts.is_active = false` and records time and actor.
  Comments and likes stay stored but are hidden; new interactions are blocked.
- Restoring a post is a database-admin action, not an ordinary-user RPC:

```sql
update public.posts
set is_active = true, deactivated_at = null, deactivated_by = null,
    updated_at = now()
where id = '<post UUID>';
```

This does not change moderation status. A rejected post stays rejected.
Community deletion archives its posts and detaches their community references.
**Permanent account erasure still deletes the departing user's own contents.**
Soft deletion is not an indefinite-retention override of account erasure.

- Reports capture server-validated target text on creation. Later edits or post
  deactivation do not change the snapshot. Existing reports are backfilled from
  currently available content; this cannot reconstruct already deleted records.
- Students can see their own reports. Moderators can see all reports. Statuses
  are received, in review, resolved, and no violation. Review notes are mandatory.
- `review_report` locks the report, optionally deactivates its post, writes an
  immutable client-side history entry and inserts the reporter's notification
  in the same transaction. Terminal reports cannot be reviewed again.
- Realtime report/notification changes refresh the screen. A 30-second visible
  tab refresh and focus refresh reconcile posts that disappear under RLS.
- The public profile view excludes email and legal-consent metadata. The full
  profile is readable by its owner and the founder. Founder role management
  retains its existing access.
- The founder's report screen can inspect a post author's name/email with a
  reason. Official requests also require a reference. Successful inspection
  RPCs are logged with actor, subject, target, purpose and time. The application
  cannot edit/delete these log entries. Database admins retain DB-level access;
  this is not a claim that every SQL console read is audited.
- There is no anonymous-post feature in this codebase. This change does not add
  one or claim that publicly named profiles have become anonymous.

## Retention and legal text

No automatic purge timer was added, per the requested archive behavior. The
updated text does not claim that writing "indefinite" into a policy creates a
legal basis. Storage remains purpose/basis limited, and deletion requests and
legal holds need an operational policy. Reference numbers are recorded, not
validated against a court system. Review the legal draft with a qualified adviser
before relying on it for a real disclosure or retention decision.

Sources consulted:
- https://www.kvkk.gov.tr/Icerik/2050/Kisisel-Veriler
- https://www.kvkk.gov.tr/Icerik/7823/Kanunlarda-Ongorulme-Kisisel-Veri-Isleme-Sartina-Iliskin-Bilgi-Notu
- https://www.kvkk.gov.tr/SharedFolderServer/CMSFiles/bf638c8f-7455-49a7-8118-3eb2858a16b5.pdf

## Verification

`npm test` runs PGlite PostgreSQL tests against the repository's actual 03/04
migrations, report schema from 06 and new 07–09 migrations, with a minimal Auth /
profile fixture. Tests cover RLS, denied direct mutations, durable snapshots,
post restoration, atomic notifications, repeated transitions, private profile
projection, founder-only audited inspection and account/ community cascades.

These tests do not replace production verification of Supabase Auth, Realtime,
Storage, actual applied schema, or the browser UI. Build and lint must also pass.

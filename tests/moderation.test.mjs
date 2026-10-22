import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const sqlFile = (name) =>
  readFile(new URL(`../supabase/${name}`, import.meta.url), "utf8");
const ids = {
  founder: "00000000-0000-0000-0000-000000000006",
  author: "00000000-0000-0000-0000-000000000001",
  reporter: "00000000-0000-0000-0000-000000000002",
  stranger: "00000000-0000-0000-0000-000000000003",
  moderator: "00000000-0000-0000-0000-000000000004",
  communityOwner: "00000000-0000-0000-0000-000000000005",
};
let postId, reportId, commentId, communityId;
async function as(user, query, params = []) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    ids[user],
  ]);
  try {
    return await db.query(query, params);
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
  }
}
async function count(table, where = "", params = []) {
  return Number(
    (
      await db.query(
        `select count(*) as n from public.${table} ${where}`,
        params,
      )
    ).rows[0].n,
  );
}

before(async () => {
  await db.exec(`
 create role anon; create role authenticated;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth, public to anon, authenticated;
 grant execute on function auth.uid() to anon, authenticated;
 create table public.profiles(id uuid primary key, full_name text not null default 'Student', role text not null default 'student',
 verification_test_completed boolean not null default true, xp integer not null default 0, helpful_votes integer not null default 0,
 verified_contributions integer not null default 0, updated_at timestamptz default now(), legal_version text not null default '',
 legal_accepted_at timestamptz, cross_border_consent_at timestamptz, age_confirmed_at timestamptz);

 alter table public.profiles add column email text not null default 'student@example.test',
 add column faculty text default '', add column department text default '',
 add column expertise_areas text[] default '{}', add column level integer default 1,
 add column avatar_url text, add column cover_url text;
 alter table public.profiles enable row level security;
 create policy "Giris yapanlar profilleri gorebilir" on public.profiles for select to authenticated using(true);
 grant select on public.profiles to authenticated;
 create function public.current_user_can_moderate() returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role in ('founder','moderator','assistant_moderator')) $$;
 create function public.current_user_is_moderator() returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role in ('founder','moderator')) $$;
 create function public.refresh_community_level(uuid) returns void language plpgsql as $$ begin return; end $$;
 create publication supabase_realtime;
 `);
  await db.exec(await sqlFile("03-canli-topluluk.sql"));
  await db.exec(await sqlFile("04-bildirimler.sql"));
  const legal = await sqlFile("06-hukuki-uyum.sql");
  const start = legal.indexOf("create table if not exists public.reports");
  const end = legal.indexOf(
    "-- ============================================================",
    start,
  );
  await db.exec(legal.slice(start, end));
  for (const [user, id] of Object.entries(ids))
    await db.query("insert into profiles(id,role) values ($1,$2)", [
      id,
      user === "moderator"
        ? "moderator"
        : user === "founder"
          ? "founder"
          : "student",
    ]);
  communityId = (
    await db.query(
      "insert into communities(founder_id,name) values ($1,'Test community') returning id",
      [ids.communityOwner],
    )
  ).rows[0].id;
  postId = (
    await db.query(
      "insert into posts(author_id,community_id,body,moderation_status) values ($1,$2,'Original reported text','approved') returning id",
      [ids.author, communityId],
    )
  ).rows[0].id;
  commentId = (
    await db.query(
      "insert into comments(author_id,post_id,body) values ($1,$2,'Comment') returning id",
      [ids.reporter, postId],
    )
  ).rows[0].id;
  await db.exec(await sqlFile("07-pasif-gonderiler-ve-sikayet-takibi.sql"));
  await db.exec(await sqlFile("08-hukuki-metin-surumu.sql"));
  await db.exec(await sqlFile("09-yetkili-kimlik-incelemesi.sql"));
});
after(async () => {
  await db.close();
});

test("report capture, privacy and client tampering protections", async () => {
  reportId = (
    await as(
      "reporter",
      "insert into reports(reporter_id,target_type,post_id,reason,details) values ($1,'post',$2,'other','Please investigate') returning id",
      [ids.reporter, postId],
    )
  ).rows[0].id;
  assert.equal(
    (
      await as("reporter", "select content_snapshot from reports where id=$1", [
        reportId,
      ])
    ).rows[0].content_snapshot,
    "Original reported text",
  );
  assert.equal((await as("stranger", "select * from reports")).rows.length, 0);
  await assert.rejects(
    as(
      "reporter",
      "update reports set status='resolved',reviewed_by=$1,reviewed_at=now() where id=$2",
      [ids.reporter, reportId],
    ),
    /permission denied/,
  );
  await assert.rejects(
    as(
      "stranger",
      "insert into reports(reporter_id,target_type,post_id,reason,content_snapshot) values ($1,'post',$2,'other','forged')",
      [ids.stranger, postId],
    ),
    /permission denied/,
  );
  await assert.rejects(
    as(
      "reporter",
      "select review_report($1,'resolved','Fake resolution','none')",
      [reportId],
    ),
    /moderatör/,
  );
  await as("author", "update posts set body='Edited later' where id=$1", [
    postId,
  ]);
  assert.equal(
    (await as("reporter", "select content_snapshot from reports")).rows[0]
      .content_snapshot,
    "Original reported text",
  );
});

test("soft deletion retains rows and prevents unauthorized viewing, restore, delete and interactions", async () => {
  await assert.rejects(
    as("stranger", "select deactivate_post($1)", [postId]),
    /yetkin yok/,
  );
  await as("author", "select deactivate_post($1)", [postId]);
  assert.equal(
    await count("posts", "where id=$1 and not is_active", [postId]),
    1,
  );
  assert.equal(await count("comments", "where id=$1", [commentId]), 1);
  for (const user of ["author", "reporter", "stranger"]) {
    assert.equal(
      (await as(user, "select * from posts where id=$1", [postId])).rows.length,
      0,
    );
    assert.equal(
      (await as(user, "select * from comments where post_id=$1", [postId])).rows
        .length,
      0,
    );
  }
  assert.equal(
    (await as("moderator", "select * from posts where id=$1", [postId])).rows
      .length,
    1,
  );
  await assert.rejects(
    as("author", "update posts set is_active=true where id=$1", [postId]),
    /permission denied/,
  );
  await assert.rejects(
    as("author", "delete from posts where id=$1", [postId]),
    /permission denied/,
  );
  await assert.rejects(
    as("stranger", "insert into post_likes(post_id,user_id) values($1,$2)", [
      postId,
      ids.stranger,
    ]),
    /row-level security/,
  );
  await assert.rejects(
    as(
      "stranger",
      "insert into comments(post_id,author_id,body) values($1,$2,'Hidden reply')",
      [postId, ids.stranger],
    ),
    /row-level security/,
  );
  await assert.rejects(
    as(
      "stranger",
      "insert into reports(reporter_id,target_type,post_id,reason) values ($1,'post',$2,'other')",
      [ids.stranger, postId],
    ),
    /erişilebilir değil/,
  );
  assert.equal(
    (await as("reporter", "select * from reports where id=$1", [reportId])).rows
      .length,
    1,
  );
  await db.query(
    "update posts set is_active=true,deactivated_at=null,deactivated_by=null where id=$1",
    [postId],
  );
  assert.equal(
    (await as("stranger", "select * from posts where id=$1", [postId])).rows
      .length,
    1,
  );
});

test("review transitions atomically persist history, deactivate content and notify only reporter", async () => {
  await as(
    "moderator",
    "select review_report($1,'reviewed','We are investigating','none')",
    [reportId],
  );
  await assert.rejects(
    as(
      "moderator",
      "select review_report($1,'reviewed','Duplicate review','none')",
      [reportId],
    ),
    /zaten/,
  );
  await assert.rejects(
    as(
      "moderator",
      "select review_report($1,'resolved','bad','deactivate_post')",
      [reportId],
    ),
    /açıklama gerekli/,
  );
  assert.equal(
    await count("report_events", "where report_id=$1", [reportId]),
    1,
  );
  await as(
    "moderator",
    "select review_report($1,'resolved','Reported post removed from the feed','deactivate_post')",
    [reportId],
  );
  assert.equal(
    await count("report_events", "where report_id=$1", [reportId]),
    2,
  );
  assert.equal(
    await count("posts", "where id=$1 and not is_active", [postId]),
    1,
  );
  assert.equal(
    (
      await as(
        "reporter",
        "select * from notifications where type='report_update'",
      )
    ).rows.length,
    2,
  );
  assert.equal(
    (
      await as(
        "stranger",
        "select * from notifications where type='report_update'",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (await as("stranger", "select * from report_events")).rows.length,
    0,
  );
  assert.equal(
    (await as("reporter", "select * from report_events")).rows.length,
    2,
  );
  await assert.rejects(
    as(
      "moderator",
      "select review_report($1,'rejected','Trying again','none')",
      [reportId],
    ),
    /zaten sonuçlandırıldı/,
  );
  assert.equal(await count("notifications", "where type='report_update'"), 2);
});

test("community removal preserves post and complaint, and migration reruns preserve history", async () => {
  await as("communityOwner", "delete from communities where id=$1", [
    communityId,
  ]);
  assert.equal(
    await count(
      "posts",
      "where id=$1 and community_id is null and not is_active",
      [postId],
    ),
    1,
  );
  assert.equal(await count("reports", "where id=$1", [reportId]), 1);
  await db.exec(await sqlFile("07-pasif-gonderiler-ve-sikayet-takibi.sql"));
  await db.exec(await sqlFile("08-hukuki-metin-surumu.sql"));
  await db.exec(await sqlFile("09-yetkili-kimlik-incelemesi.sql"));
  assert.equal(
    await count("report_events", "where report_id=$1", [reportId]),
    2,
  );
  assert.equal(
    (
      await db.query("select content_snapshot from reports where id=$1", [
        reportId,
      ])
    ).rows[0].content_snapshot,
    "Original reported text",
  );
});

test("legal acceptance requires current version and rejects null version", async () => {
  await assert.rejects(
    as("reporter", "select accept_legal_terms('2026-08-01',true,true)"),
    /güncel sürümü/,
  );
  await assert.rejects(
    as("reporter", "select accept_legal_terms(null,true,true)"),
    /güncel sürümü/,
  );
  await as("reporter", "select accept_legal_terms('2026-10-22',true,true)");
  assert.equal(
    (
      await db.query("select legal_version from profiles where id=$1", [
        ids.reporter,
      ])
    ).rows[0].legal_version,
    "2026-10-22",
  );
});

test("private profile data is restricted but public profiles and profile reports keep working", async () => {
  for (const user of ["reporter", "stranger", "moderator"]) {
    const privateRows = (await as(user, "select * from profiles")).rows;
    assert.equal(privateRows.length, 1);
    assert.equal(privateRows[0].id, ids[user]);
    const communityRows = (await as(user, "select * from community_profiles"))
      .rows;
    assert.equal(communityRows.length, 6);
    assert.equal(Object.hasOwn(communityRows[0], "email"), false);
    assert.equal(Object.hasOwn(communityRows[0], "legal_accepted_at"), false);
  }
  assert.equal((await as("founder", "select * from profiles")).rows.length, 6);
  await as(
    "reporter",
    "insert into reports(reporter_id,target_type,profile_id,reason) values ($1,'profile',$2,'other')",
    [ids.reporter, ids.stranger],
  );
});

test("founder identity inspection validates reasons and records successful access only", async () => {
  for (const user of ["reporter", "moderator"])
    await assert.rejects(
      as(
        user,
        "select inspect_post_author($1,'moderation','A concrete safety issue',null)",
        [postId],
      ),
      /kurucu/,
    );
  await assert.rejects(
    as("founder", "select inspect_post_author($1,'moderation','short',null)", [
      postId,
    ]),
    /gerekçesi gerekli/,
  );
  await assert.rejects(
    as(
      "founder",
      "select inspect_post_author($1,'authority_request','A concrete authority request',null)",
      [postId],
    ),
    /evrak referansını/,
  );
  assert.equal(await count("identity_access_log"), 0);
  const result = (
    await as(
      "founder",
      "select inspect_post_author($1,'moderation','Investigating the reported post',null) as identity",
      [postId],
    )
  ).rows[0].identity;
  assert.equal(result.email, "student@example.test");
  assert.equal(await count("identity_access_log"), 1);
  const entry = (await as("founder", "select * from identity_access_log"))
    .rows[0];
  assert.equal(entry.actor_id, ids.founder);
  assert.equal(entry.subject_id, ids.author);
  assert.equal(
    (await as("moderator", "select * from identity_access_log")).rows.length,
    0,
  );
  await assert.rejects(
    as("founder", "delete from identity_access_log"),
    /permission denied/,
  );
  await assert.rejects(
    as("founder", "update identity_access_log set reason='tampering'"),
    /permission denied/,
  );
  await as(
    "founder",
    "select inspect_post_author($1,'authority_request','A specific documented authority request','Test authority / TEST-001')",
    [postId],
  );
  assert.equal(await count("identity_access_log"), 2);
});

test("account erasure does not break when the departing account owns a community", async () => {
  const community = (
    await db.query(
      "insert into communities(founder_id,name) values($1,'Account deletion community') returning id",
      [ids.communityOwner],
    )
  ).rows[0].id;
  const post = (
    await db.query(
      "insert into posts(author_id,community_id,body,moderation_status) values($1,$2,'Another author post','approved') returning id",
      [ids.author, community],
    )
  ).rows[0].id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    ids.communityOwner,
  ]);
  try {
    await db.query("delete from profiles where id=$1", [ids.communityOwner]);
  } finally {
    await db.query("select set_config('request.jwt.claim.sub','',false)");
  }
  const retained = (await db.query("select * from posts where id=$1", [post]))
    .rows[0];
  assert.equal(retained.is_active, false);
  assert.equal(retained.community_id, null);
  assert.equal(retained.deactivated_by, null);
});

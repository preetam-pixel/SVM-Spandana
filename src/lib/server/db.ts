import fs from "node:fs";
import path from "node:path";
import { DEMO_PROFILE, MASK_POSTS } from "@/lib/data";
import type { Account, Dept, Profile } from "@/lib/types";

// Built-in SQLite (Node 22.5+). Loaded via getBuiltinModule so the bundler leaves it alone.
const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
type DB = InstanceType<typeof DatabaseSync>;

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const DEMO_PHONE = "+919000000001";

const g = globalThis as unknown as { __svmDb?: DB };

export function db(): DB {
  if (g.__svmDb) return g.__svmDb;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const d = new DatabaseSync(path.join(DATA_DIR, "spandana.db"));
  d.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      usn TEXT DEFAULT '', email TEXT DEFAULT '', dept TEXT DEFAULT 'CSE', year INTEGER DEFAULT 1,
      bio TEXT DEFAULT '', instagram TEXT DEFAULT '', youtube TEXT DEFAULT '', avatar TEXT DEFAULT '',
      profile TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS otps (
      phone TEXT PRIMARY KEY, code_hash TEXT, expires_at INTEGER, attempts INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0, window_start INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, alias TEXT NOT NULL,
      kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT, media TEXT, mime TEXT, notes TEXT, seed INTEGER,
      heart INTEGER DEFAULT 0, fire INTEGER DEFAULT 0, wow INTEGER DEFAULT 0, clap INTEGER DEFAULT 0,
      unmasked TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT, body TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  seed(d);
  g.__svmDb = d;
  return d;
}

function seed(d: DB) {
  const hasPosts = (d.prepare("SELECT COUNT(*) AS n FROM posts").get() as { n: number }).n > 0;
  if (!hasPosts) {
    const now = Date.now();
    const insert = d.prepare(
      `INSERT INTO posts (id, user_id, alias, kind, title, body, notes, seed, heart, fire, wow, clap, unmasked, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const comment = d.prepare("INSERT INTO comments (post_id, body, created_at) VALUES (?, ?, ?)");
    for (const p of MASK_POSTS) {
      const at = now - p.hoursAgo * 3_600_000;
      insert.run(p.id, p.alias, p.kind, p.title, p.text ?? null, p.notes ? JSON.stringify(p.notes) : null, p.seed ?? null,
        p.reactions.heart, p.reactions.fire, p.reactions.wow, p.reactions.clap, p.unmasked ?? null, at);
      p.comments.forEach((c, i) => comment.run(p.id, c, at + (i + 1) * 600_000));
    }
  }
  const demo = d.prepare("SELECT id FROM users WHERE phone = ?").get(DEMO_PHONE);
  if (!demo) {
    const { name, dept, year, ...rest } = DEMO_PROFILE;
    d.prepare(
      `INSERT INTO users (id, phone, name, usn, email, dept, year, bio, instagram, profile, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("u_demo", DEMO_PHONE, name, "2KE24CS011", "ananya.k@example.com", dept, year,
      "Writes poems in the margins of lab records. Recently discovered she can keep a beat.", "ananya.writes", JSON.stringify(rest), Date.now());
  }
}

interface UserRow {
  id: string; phone: string; name: string; usn: string; email: string; dept: string; year: number;
  bio: string; instagram: string; youtube: string; avatar: string; profile: string; created_at: number;
}

export function toAccount(r: UserRow): Account {
  const stored = JSON.parse(r.profile || "{}") as Partial<Profile>;
  const profile: Profile = { ...DEMO_PROFILE, ...EMPTY_STATE, ...stored, name: r.name, dept: r.dept as Dept, year: r.year };
  return {
    id: r.id, phone: r.phone, name: r.name, usn: r.usn, email: r.email, dept: r.dept as Dept, year: r.year,
    bio: r.bio, instagram: r.instagram, youtube: r.youtube, avatar: r.avatar, createdAt: r.created_at, profile,
  };
}

// Fresh accounts start with no DNA and nothing joined.
const EMPTY_STATE: Partial<Profile> = {
  dna: { rhythm: 0, melody: 0, visual: 0, verbal: 0, movement: 0, stage: 0 },
  sparkDone: false, declared: [], hiddenSpark: null, level: 0, stamps: [], joined: [], quests: [], contributions: [], myPosts: [], streakWeeks: 0,
};

export function userById(id: string): Account | null {
  const r = db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return r ? toAccount(r) : null;
}

export function userByPhone(phone: string): Account | null {
  const r = db().prepare("SELECT * FROM users WHERE phone = ?").get(phone) as UserRow | undefined;
  return r ? toAccount(r) : null;
}

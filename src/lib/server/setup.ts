/** Errors for databases that haven't run a migration yet, so routes can explain the fix instead of failing. */

type DbError = { code?: string; message?: string } | null | undefined;

// PostgREST: "Could not find the table 'public.x' in the schema cache" (PGRST205) or a missing column (PGRST204);
// Postgres: undefined_table (42P01) / undefined_column (42703).
export const isMissing = (e: DbError) =>
  !!e && (["PGRST205", "PGRST204", "42P01", "42703"].includes(e.code ?? "") || /schema cache|does not exist/.test(e.message ?? ""));

export class SetupNeeded extends Error {}

export class FriendsNotSetUp extends SetupNeeded {
  constructor() {
    super("Friends need a one-time database update: run supabase/migrations/002_friends.sql in the Supabase SQL editor.");
  }
}

export class EventsNotSetUp extends SetupNeeded {
  constructor() {
    super("Events need a one-time database update: run supabase/migrations/003_events_achievements.sql in the Supabase SQL editor.");
  }
}

export class ClubNotSetUp extends SetupNeeded {
  constructor() {
    super("Club trophies and opportunities need a one-time database update: run supabase/migrations/004_club_opportunities.sql in the Supabase SQL editor.");
  }
}

/** Rows from a query; a missing table becomes ClubNotSetUp. */
export async function clubRows<T>(q: PromiseLike<{ data: unknown; error: DbError }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw isMissing(error) ? new ClubNotSetUp() : error;
  return (data ?? []) as T[];
}

/** Rows from a query, or [] when its table doesn't exist yet (other errors still throw). */
export async function rowsOrEmpty<T>(q: PromiseLike<{ data: unknown; error: DbError }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  return (data ?? []) as T[];
}

/** Rows from a query; a missing table becomes EventsNotSetUp. */
export async function eventRows<T>(q: PromiseLike<{ data: unknown; error: DbError }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw isMissing(error) ? new EventsNotSetUp() : error;
  return (data ?? []) as T[];
}

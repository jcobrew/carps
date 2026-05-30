/**
 * Database schema (Drizzle + libSQL/SQLite).
 *
 * This typed schema doubles as the data-model documentation. The same code runs
 * against a local file (`file:./dev.db`) in development and against Turso (hosted
 * libSQL) in production — only the connection string changes.
 *
 * IDs are nanoid strings; timestamps are epoch milliseconds (integers).
 */
import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

/** A person. Identified solely by possessing their `token` (coat-check model). */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  /** The bearer token embedded in the user's personal URL. No password. */
  token: text('token').notNull().unique(),
  createdAt: integer('created_at').notNull(),
});

/** A trip-planning group with a shareable invite and a ~6-month target window. */
export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Embedded in the invite link; anyone with it can join. */
  inviteToken: text('invite_token').notNull().unique(),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  /** Epoch ms of week index 0 (start of the planning window). */
  windowStart: integer('window_start').notNull(),
  /** Epoch ms of the end of the planning window. */
  windowEnd: integer('window_end').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** A user's membership in a group, carrying that member's trip inputs. */
export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** IATA code, e.g. "NRT". Null until the member sets it. */
    homeAirport: text('home_airport'),
    /** The member's budget ceiling. Null until set. */
    budget: integer('budget'),
    joinedAt: integer('joined_at').notNull(),
  },
  (t) => [unique().on(t.groupId, t.userId)],
);

/** One painted "I could travel this week" cell, at week-level granularity. */
export const availabilityPaints = sqliteTable(
  'availability_paints',
  {
    id: text('id').primaryKey(),
    membershipId: text('membership_id')
      .notNull()
      .references(() => memberships.id),
    /** Index into the group's window: 0..weekCount-1. */
    weekIndex: integer('week_index').notNull(),
    /** Present + true = available. Rows are deleted when un-painted. */
    available: integer('available', { mode: 'boolean' }).notNull(),
  },
  (t) => [unique().on(t.membershipId, t.weekIndex)],
);

/**
 * A proposal produced by a convergence run. Persisted so the group surface stays
 * "alive" across refreshes. Several proposals share a `runId`; a failed run is
 * stored as a single row with `failureCode`/`failureReason` set and rank 0.
 */
export const proposals = sqliteTable('proposals', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id),
  /** Groups the 1–3 proposals (or the failure) from one "Find us a trip" click. */
  runId: text('run_id').notNull(),
  rank: integer('rank').notNull(),
  destinationCode: text('destination_code'),
  destinationName: text('destination_name'),
  startWeekIndex: integer('start_week_index'),
  endWeekIndex: integer('end_week_index'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  /** JSON-encoded Record<userId, cost>. */
  perMemberCost: text('per_member_cost'),
  burdenSpread: real('burden_spread'),
  totalCost: integer('total_cost'),
  rationale: text('rationale'),
  /** Set instead of the trip fields when the run produced no valid proposal. */
  failureCode: text('failure_code'),
  failureReason: text('failure_reason'),
  createdAt: integer('created_at').notNull(),
});

/** An Accept / Suggest-change reaction by one member to one proposal. */
export const reactions = sqliteTable(
  'reactions',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id')
      .notNull()
      .references(() => proposals.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 'accept' | 'suggest'. */
    kind: text('kind').notNull(),
    /** Free-text note for a "suggest a change" reaction. */
    comment: text('comment'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [unique().on(t.proposalId, t.userId)],
);

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type AvailabilityPaint = typeof availabilityPaints.$inferSelect;
export type ProposalRow = typeof proposals.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;

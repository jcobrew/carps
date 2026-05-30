/**
 * Typed read/write helpers — the only place the rest of the app touches the DB.
 */
import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './client';
import {
  users,
  groups,
  memberships,
  availabilityPaints,
  proposals,
  reactions,
  type User,
  type Group,
  type Membership,
  type ProposalRow,
  type Reaction,
} from './schema';
import { newId, newToken } from '../lib/ids';

const now = () => Date.now();

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUser(name: string, email: string): Promise<User> {
  const user = {
    id: newId(),
    name,
    email: email.toLowerCase(),
    token: newToken(),
    createdAt: now(),
  };
  await db.insert(users).values(user);
  return user;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

export async function findUserByToken(token: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.token, token) });
}

/**
 * Find a user by email or create one. Avoids forking identities when the same
 * person signs up and then joins (or joins twice). Returns the user and whether
 * it was newly created (so callers can surface the personal link).
 */
export async function findOrCreateUserByEmail(
  name: string,
  email: string,
): Promise<{ user: User; created: boolean }> {
  const existing = await findUserByEmail(email);
  if (existing) return { user: existing, created: false };
  return { user: await createUser(name, email), created: true };
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function createGroup(
  createdById: string,
  name: string,
  windowStart: number,
  windowEnd: number,
): Promise<Group> {
  const group = {
    id: newId(),
    name,
    inviteToken: newToken(),
    createdById,
    windowStart,
    windowEnd,
    createdAt: now(),
  };
  await db.insert(groups).values(group);
  // The creator is automatically a member.
  await ensureMembership(group.id, createdById);
  return group;
}

export async function findGroupByInvite(
  inviteToken: string,
): Promise<Group | undefined> {
  return db.query.groups.findFirst({
    where: eq(groups.inviteToken, inviteToken),
  });
}

export async function findGroupById(id: string): Promise<Group | undefined> {
  return db.query.groups.findFirst({ where: eq(groups.id, id) });
}

/** Groups the user belongs to (most recent first). */
export async function listGroupsForUser(userId: string): Promise<Group[]> {
  const rows = await db
    .select({ group: groups })
    .from(memberships)
    .innerJoin(groups, eq(memberships.groupId, groups.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(groups.createdAt));
  return rows.map((r) => r.group);
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export async function findMembership(
  groupId: string,
  userId: string,
): Promise<Membership | undefined> {
  return db.query.memberships.findFirst({
    where: and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)),
  });
}

/** Create the membership if it doesn't already exist; return it either way. */
export async function ensureMembership(
  groupId: string,
  userId: string,
): Promise<Membership> {
  const existing = await findMembership(groupId, userId);
  if (existing) return existing;
  const membership = {
    id: newId(),
    groupId,
    userId,
    homeAirport: null,
    budget: null,
    joinedAt: now(),
  };
  await db.insert(memberships).values(membership);
  return membership;
}

export interface MemberView {
  membership: Membership;
  user: User;
}

/** All memberships in a group with their user, ordered by join time. */
export async function listMembers(groupId: string): Promise<MemberView[]> {
  const rows = await db
    .select({ membership: memberships, user: users })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.groupId, groupId))
    .orderBy(memberships.joinedAt);
  return rows;
}

export async function setMemberInputs(
  membershipId: string,
  homeAirport: string,
  budget: number,
): Promise<void> {
  await db
    .update(memberships)
    .set({ homeAirport, budget })
    .where(eq(memberships.id, membershipId));
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** Painted (available) week indices for one membership. */
export async function getPaintedWeeks(membershipId: string): Promise<number[]> {
  const rows = await db
    .select({ weekIndex: availabilityPaints.weekIndex })
    .from(availabilityPaints)
    .where(
      and(
        eq(availabilityPaints.membershipId, membershipId),
        eq(availabilityPaints.available, true),
      ),
    );
  return rows.map((r) => r.weekIndex).sort((a, b) => a - b);
}

/** Toggle one week on/off. Painting on upserts; painting off deletes the row. */
export async function setPaintedWeek(
  membershipId: string,
  weekIndex: number,
  available: boolean,
): Promise<void> {
  if (available) {
    await db
      .insert(availabilityPaints)
      .values({ id: newId(), membershipId, weekIndex, available: true })
      .onConflictDoUpdate({
        target: [availabilityPaints.membershipId, availabilityPaints.weekIndex],
        set: { available: true },
      });
  } else {
    await db
      .delete(availabilityPaints)
      .where(
        and(
          eq(availabilityPaints.membershipId, membershipId),
          eq(availabilityPaints.weekIndex, weekIndex),
        ),
      );
  }
}

/** Painted weeks for every membership in a group, keyed by membershipId. */
export async function getGroupPaints(
  membershipIds: string[],
): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  for (const id of membershipIds) out[id] = [];
  if (membershipIds.length === 0) return out;
  const rows = await db
    .select({
      membershipId: availabilityPaints.membershipId,
      weekIndex: availabilityPaints.weekIndex,
    })
    .from(availabilityPaints)
    .where(
      and(
        inArray(availabilityPaints.membershipId, membershipIds),
        eq(availabilityPaints.available, true),
      ),
    );
  for (const r of rows) (out[r.membershipId] ??= []).push(r.weekIndex);
  for (const id of membershipIds) out[id].sort((a, b) => a - b);
  return out;
}

// ---------------------------------------------------------------------------
// Proposals (convergence runs)
// ---------------------------------------------------------------------------

export async function insertProposalRows(
  rows: (typeof proposals.$inferInsert)[],
): Promise<void> {
  if (rows.length > 0) await db.insert(proposals).values(rows);
}

/** The proposals (or failure row) from the most recent run, ranked. */
export async function getLatestRun(groupId: string): Promise<ProposalRow[]> {
  const latest = await db.query.proposals.findFirst({
    where: eq(proposals.groupId, groupId),
    orderBy: (p, { desc }) => desc(p.createdAt),
  });
  if (!latest) return [];
  return db
    .select()
    .from(proposals)
    .where(eq(proposals.runId, latest.runId))
    .orderBy(proposals.rank);
}

export async function getProposalById(
  id: string,
): Promise<ProposalRow | undefined> {
  return db.query.proposals.findFirst({ where: eq(proposals.id, id) });
}

export { newId as newRunId };

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export async function upsertReaction(
  proposalId: string,
  userId: string,
  kind: 'accept' | 'suggest',
  comment: string | null,
): Promise<void> {
  await db
    .insert(reactions)
    .values({ id: newId(), proposalId, userId, kind, comment, createdAt: now() })
    .onConflictDoUpdate({
      target: [reactions.proposalId, reactions.userId],
      set: { kind, comment, createdAt: now() },
    });
}

export interface ReactionView {
  reaction: Reaction;
  user: User;
}

/** All reactions to a set of proposals, with the reacting user. */
export async function listReactions(
  proposalIds: string[],
): Promise<ReactionView[]> {
  if (proposalIds.length === 0) return [];
  return db
    .select({ reaction: reactions, user: users })
    .from(reactions)
    .innerJoin(users, eq(reactions.userId, users.id))
    .where(inArray(reactions.proposalId, proposalIds));
}

/** URL-safe id and token helpers (nanoid). */
import { nanoid } from 'nanoid';

/** Short entity id (used for primary keys). */
export const newId = (): string => nanoid(12);

/** Longer, harder-to-guess token for identity / invite links. */
export const newToken = (): string => nanoid(24);

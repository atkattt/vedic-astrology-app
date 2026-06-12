import { pgTable, text, timestamp, boolean, serial, integer } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// People in the user's circle — each is a star in their constellation.
// Scoped per user via the `userId` column (no RLS on Neon).

export const people = pgTable('people', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  birthDate: text('birthDate'), // ISO date string (YYYY-MM-DD)
  birthTime: text('birthTime'), // HH:MM, null when unknown
  birthTimeUnknown: boolean('birthTimeUnknown').notNull().default(false),
  birthPlace: text('birthPlace'), // city name
  // Fixed position on the constellation canvas (0-1 fractions)
  posX: integer('posX').notNull().default(50),
  posY: integer('posY').notNull().default(50),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Bonds between two people, drawn as lines in the constellation.
export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  fromPersonId: integer('fromPersonId').notNull(),
  toPersonId: integer('toPersonId').notNull(),
  kind: text('kind').notNull(), // mother | father | sibling | partner | friend
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  serial,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Better Auth tables — column names are camelCase to match Better Auth defaults.
// Do not rename these.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// ---------------------------------------------------------------------------
// App tables — scoped per user via a plain `userId` column (no FK by design).
// ---------------------------------------------------------------------------

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  birthDate: text("birthDate"),
  birthTime: text("birthTime"),
  birthTimeUnknown: boolean("birthTimeUnknown").notNull().default(false),
  birthPlace: text("birthPlace"),
  posX: integer("posX").notNull().default(50),
  posY: integer("posY").notNull().default(50),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  fromPersonId: integer("fromPersonId").notNull(),
  toPersonId: integer("toPersonId").notNull(),
  kind: text("kind").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Per-user exploration progress for the explorable universe (Layer 4). Stores
// how far the "revealed frontier" has expanded from the center. One row per user.
export const userProgress = pgTable("user_progress", {
  userId: text("userId").primaryKey(),
  revealRadius: integer("revealRadius").notNull().default(150),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export type Person = typeof people.$inferSelect
export type Relationship = typeof relationships.$inferSelect
export type UserProgress = typeof userProgress.$inferSelect

CREATE TABLE progress (owner_id TEXT PRIMARY KEY NOT NULL, document TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE evidence (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, object_key TEXT, mime TEXT, byte_size INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('recent','inspiration')), reference TEXT NOT NULL DEFAULT '', sort_group TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE INDEX evidence_owner ON evidence (owner_id, created_at);
CREATE TABLE entitlements (owner_id TEXT PRIMARY KEY NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','blocked')), source TEXT NOT NULL, updated_at TEXT NOT NULL);

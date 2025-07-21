-- Moemail Database Schema
-- This file contains the complete database structure for Moemail

-- Users table
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" integer,
	"image" text,
	"createdAt" integer DEFAULT (unixepoch()) NOT NULL,
	"updatedAt" integer DEFAULT (unixepoch()) NOT NULL,
	"maxEmails" integer DEFAULT 10 NOT NULL
);

-- Accounts table (for OAuth)
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"createdAt" integer DEFAULT (unixepoch()) NOT NULL,
	"updatedAt" integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

-- Roles table
CREATE TABLE IF NOT EXISTS "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" integer DEFAULT (unixepoch()) NOT NULL,
	"updatedAt" integer DEFAULT (unixepoch()) NOT NULL
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS "user_role" (
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"assignedAt" integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY("userId", "roleId"),
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("roleId") REFERENCES "role"("id") ON UPDATE no action ON DELETE cascade
);

-- Email addresses table
CREATE TABLE IF NOT EXISTS "email" (
	"id" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"userId" text,
	"createdAt" integer DEFAULT (unixepoch()) NOT NULL,
	"expiresAt" integer,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE set null
);

-- Messages table
CREATE TABLE IF NOT EXISTS "message" (
	"id" text PRIMARY KEY NOT NULL,
	"emailId" text NOT NULL,
	"subject" text,
	"from" text,
	"to" text,
	"html" text,
	"text" text,
	"receivedAt" integer DEFAULT (unixepoch()) NOT NULL,
	"isRead" integer DEFAULT 0 NOT NULL,
	FOREIGN KEY ("emailId") REFERENCES "email"("id") ON UPDATE no action ON DELETE cascade
);

-- API Keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"permissions" text DEFAULT '[]' NOT NULL,
	"lastUsed" integer,
	"createdAt" integer DEFAULT (unixepoch()) NOT NULL,
	"expiresAt" integer,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS "webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"url" text NOT NULL,
	"events" text DEFAULT '[]' NOT NULL,
	"secret" text,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdAt" integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "email_address_idx" ON "email"("address");
CREATE INDEX IF NOT EXISTS "email_userId_idx" ON "email"("userId");
CREATE INDEX IF NOT EXISTS "message_emailId_idx" ON "message"("emailId");
CREATE INDEX IF NOT EXISTS "message_receivedAt_idx" ON "message"("receivedAt");
CREATE INDEX IF NOT EXISTS "api_keys_userId_idx" ON "api_keys"("userId");
CREATE INDEX IF NOT EXISTS "api_keys_key_idx" ON "api_keys"("key");

-- Insert default roles
INSERT OR IGNORE INTO "role" ("id", "name", "description") VALUES 
('emperor', '皇帝', 'Highest level access with all permissions'),
('duke', '公爵', 'High level access with most permissions'),
('knight', '骑士', 'Medium level access with some permissions'),
('citizen', '平民', 'Basic level access with limited permissions');

-- Insert a default admin user (optional, can be removed in production)
-- INSERT OR IGNORE INTO "user" ("id", "name", "email", "maxEmails") VALUES 
-- ('admin', 'Admin User', 'admin@example.com', 1000);

-- INSERT OR IGNORE INTO "user_role" ("userId", "roleId") VALUES 
-- ('admin', 'emperor');

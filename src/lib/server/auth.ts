import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import type { AnyD1Database } from 'drizzle-orm/d1';

const authConfig = {
	secret: env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

export const createAuth = (origin: string, d1: AnyD1Database) =>
	betterAuth({
		...{ authConfig, baseURL: origin },
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' })
	});

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!, null!);

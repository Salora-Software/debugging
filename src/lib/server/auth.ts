import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import type { AnyD1Database } from 'drizzle-orm/d1';
import { magicLink, openAPI, organization } from 'better-auth/plugins';

const authConfig = {
	secret: env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		password: {
			hash: async (password) => {
				const encoder = new TextEncoder();
				const salt = crypto.getRandomValues(new Uint8Array(16));
				const keyMaterial = await crypto.subtle.importKey(
					'raw',
					encoder.encode(password),
					{ name: 'PBKDF2' },
					false,
					['deriveBits']
				);

				// 100.000 iteraties is een redelijke balans tussen veiligheid en de Worker limieten
				const hashBuffer = await crypto.subtle.deriveBits(
					{
						name: 'PBKDF2',
						salt,
						iterations: 100000,
						hash: 'SHA-256'
					},
					keyMaterial,
					256
				);

				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
				const saltHex = Array.from(salt)
					.map((b) => b.toString(16).padStart(2, '0'))
					.join('');

				return `${saltHex}:${hashHex}`;
			},
			verify: async ({ hash, password }) => {
				const [saltHex, originalHash] = hash.split(':');
				const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
				const encoder = new TextEncoder();

				const keyMaterial = await crypto.subtle.importKey(
					'raw',
					encoder.encode(password),
					{ name: 'PBKDF2' },
					false,
					['deriveBits']
				);

				const hashBuffer = await crypto.subtle.deriveBits(
					{
						name: 'PBKDF2',
						salt,
						iterations: 100000,
						hash: 'SHA-256'
					},
					keyMaterial,
					256
				);

				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const newHashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

				return newHashHex === originalHash;
			}
		}
	},
	plugins: [
		openAPI(),
		organization({
			schema: {
				organization: {
					additionalFields: {
						onboardingStep: { type: 'number' },
						location: { type: 'string' },
						phone: { type: 'string' },
						email: { type: 'string' },
						website: { type: 'string' },
						timeZone: { type: 'string' }
					}
				}
			}
		}),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				console.log('Sending magic link to:', email);
				console.log('Magic link URL:', url);
			},
			disableSignUp: true
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

export const createAuth = (origin: string = 'http://localhost:5173', d1: AnyD1Database) =>
	betterAuth({
		...authConfig,
		baseURL: origin,
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' })
	});

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth('http://localhost:5173', null!);

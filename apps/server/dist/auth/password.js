import argon2 from "argon2";
/**
 * Password hashing using Argon2id (RFC 9106) — the recommended PHC winner.
 *
 * Defaults (sane for production):
 *   type:        argon2id (time-memory tradeoff, side-channel resistant)
 *   timeCost:    3 (iterations)
 *   memoryCost:  4096 KiB (4 MB)
 *   parallelism: 1 (single thread)
 *
 * The hash output encodes the algorithm + parameters + salt + raw hash, so
 * verifyPassword() doesn't need to remember the parameters — they're read
 * from the hash string itself. This lets us tune defaults over time without
 * breaking existing stored hashes.
 */
export async function hashPassword(plain) {
    return argon2.hash(plain, { type: argon2.argon2id });
}
export async function verifyPassword(plain, hash) {
    try {
        return await argon2.verify(hash, plain);
    }
    catch {
        // Malformed hash, unsupported variant, etc. — never throw to caller.
        return false;
    }
}

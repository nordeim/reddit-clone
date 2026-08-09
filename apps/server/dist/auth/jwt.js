import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { randomUUID } from "node:crypto";
/**
 * JWT helpers — issue/verify access and refresh tokens (ADR-104).
 *
 * Algorithm: HS256 (HMAC-SHA-256). The plan recommends RS256 (asymmetric)
 * for production-grade deployments, but HS256 is appropriate for this
 * monorepo's single-server setup and avoids the key-management overhead
 * of a public/private keypair. The escape hatch is documented in
 * `docs/REMEDIATION_EXECUTION_PLAN.md` §5 — switch to RS256 by replacing
 * these functions with `SignJWT.setProtectedHeader({ alg: 'RS256' })`
 * and a `crypto.createPrivateKey()` import.
 *
 * Tokens:
 *   - Access:  15-minute TTL, contains { id, username }
 *   - Refresh: 7-day TTL, contains { id, jti } — the jti is stored in
 *              the `sessions` table so refresh tokens can be rotated
 *              and revoked.
 */
const ISSUER = "embers";
const AUDIENCE = "embers-client";
export async function signAccessToken(payload, secret, ttl) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(payload.id)
        .setExpirationTime(ttl)
        .sign(new TextEncoder().encode(secret));
}
/**
 * Sign a refresh token. The jti is auto-generated (UUIDv4) so callers
 * don't need to manage jti creation. The caller must read the jti from
 * the returned payload via verifyRefreshToken() if they need to store
 * it (e.g. for revocation).
 */
export async function signRefreshToken(payload, secret, ttl) {
    const jti = payload.jti ?? newJti();
    return new SignJWT({ id: payload.id })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(payload.id)
        .setJti(jti)
        .setExpirationTime(ttl)
        .sign(new TextEncoder().encode(secret));
}
export async function verifyAccessToken(token, secret) {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        issuer: ISSUER,
        audience: AUDIENCE,
    });
    return {
        id: payload.sub,
        username: payload.username,
    };
}
export async function verifyRefreshToken(token, secret) {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        issuer: ISSUER,
        audience: AUDIENCE,
    });
    return {
        id: payload.sub,
        jti: payload.jti,
    };
}
/**
 * Decode a refresh token WITHOUT verifying the signature. Used to inspect
 * the jti of an expired or otherwise invalid token (e.g. for cleanup).
 * Returns null for malformed tokens.
 */
export function decodeRefreshToken(token) {
    try {
        const payload = decodeJwt(token);
        if (typeof payload.sub !== "string" || typeof payload.jti !== "string") {
            return null;
        }
        return { id: payload.sub, jti: payload.jti };
    }
    catch {
        return null;
    }
}
export function newJti() {
    return randomUUID();
}

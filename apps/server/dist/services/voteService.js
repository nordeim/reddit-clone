/**
 * voteService — atomic vote casting with concurrent-safe counter updates.
 *
 * The vote lifecycle:
 *   1. No vote → cast value (1 or -1). Counter: +1 to upvotes (if value=1)
 *      or +1 to downvotes (if value=-1).
 *   2. Existing same value → toggle off. Counter: -1 from upvotes (if value
 *      was 1) or -1 from downvotes (if value was -1). Vote row deleted.
 *   3. Existing opposite value → flip. Counter: -1 from old + +1 to new.
 *      Vote row updated.
 *   4. value=0 → toggle off regardless of current state.
 *
 * All counter updates use atomic `UPDATE … SET col = col + delta WHERE …`
 * SQL — never read-modify-write — so concurrent votes on the same target
 * never lose updates (ADR-108).
 */
export function createVoteService(db, deps) {
    return {
        castVote(input) {
            // better-sqlite3 is synchronous and single-connection: any query on
            // `db` (via the repositories) inside this transaction callback executes
            // within the BEGIN/COMMIT block automatically. The `tx` parameter is
            // therefore unused — omitted to keep the type signature clean.
            return db.transaction(() => {
                // Read existing vote inside the transaction.
                const existing = deps.voteRepo.find(input.userId, input.targetId, input.targetType);
                // Resolve the counter-incrementer for the target type
                const incrementCounters = (deltaUp, deltaDown) => {
                    if (input.targetType === "post") {
                        deps.postRepo.incrementVoteCounters(input.targetId, deltaUp, deltaDown);
                    }
                    else {
                        deps.commentRepo.incrementVoteCounters(input.targetId, deltaUp, deltaDown);
                    }
                };
                // Helper: read the current score (upvotes - downvotes) for the response
                const readScore = () => {
                    if (input.targetType === "post") {
                        const post = deps.postRepo.findById(input.targetId);
                        return post ? post.upvotes - post.downvotes : 0;
                    }
                    const comment = deps.commentRepo.findById(input.targetId);
                    return comment ? comment.upvotes - comment.downvotes : 0;
                };
                if (!existing) {
                    // Case 1: no prior vote
                    if (input.value === 0) {
                        // Nothing to do; no-op
                        return {
                            targetId: input.targetId,
                            targetType: input.targetType,
                            value: 0,
                            score: readScore(),
                        };
                    }
                    deps.voteRepo.insert({
                        userId: input.userId,
                        targetId: input.targetId,
                        targetType: input.targetType,
                        value: input.value,
                    });
                    // Increment counter atomically
                    incrementCounters(input.value === 1 ? 1 : 0, input.value === -1 ? 1 : 0);
                    return {
                        targetId: input.targetId,
                        targetType: input.targetType,
                        value: input.value,
                        score: readScore(),
                    };
                }
                // Case 2: existing vote, same value → toggle off
                if (existing.value === input.value || input.value === 0) {
                    deps.voteRepo.delete(input.userId, input.targetId, input.targetType);
                    // Decrement the appropriate counter
                    incrementCounters(existing.value === 1 ? -1 : 0, existing.value === -1 ? -1 : 0);
                    return {
                        targetId: input.targetId,
                        targetType: input.targetType,
                        value: 0,
                        score: readScore(),
                    };
                }
                // Case 3: existing opposite value → flip
                deps.voteRepo.update(input.userId, input.targetId, input.targetType, input.value);
                // Decrement old, increment new (atomic)
                incrementCounters(existing.value === 1 ? -1 : (input.value === 1 ? 1 : 0), existing.value === -1 ? -1 : (input.value === -1 ? 1 : 0));
                return {
                    targetId: input.targetId,
                    targetType: input.targetType,
                    value: input.value,
                    score: readScore(),
                };
            });
        },
    };
}

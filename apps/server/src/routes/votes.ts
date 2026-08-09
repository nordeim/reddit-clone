import type { FastifyInstance } from "fastify";
import { castVoteInputSchema } from "@embers/shared";
import type { VoteService } from "../services/voteService.js";

export interface VoteRouteDeps {
  voteService: VoteService;
}

export function buildVoteRoutes(deps: VoteRouteDeps) {
  return async function voteRoutes(app: FastifyInstance): Promise<void> {
    /**
     * PUT /api/votes/:targetId — cast / toggle / flip a vote (auth required).
     * Body: { targetType, value }
     * Atomic via voteService.castVote (transactional, SQL-atomic counters).
     */
    app.put("/api/votes/:targetId", {
      preHandler: [app.authenticate],
    }, async (req, reply) => {
      const { targetId } = req.params as { targetId: string };
      const parsed = castVoteInputSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(422);
        throw parsed.error;
      }
      const user = req.user!;
      const result = deps.voteService.castVote({
        userId: user.id,
        targetId,
        targetType: parsed.data.targetType,
        value: parsed.data.value,
      });
      return reply.send({
        targetId: result.targetId,
        targetType: result.targetType,
        value: result.value,
        score: result.score,
      });
    });
  };
}

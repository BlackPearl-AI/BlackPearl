/** Execution-time authority checks for the model-facing goal tools. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { GoalView } from '@deepseek-ai/dsh-goal';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
type TurnStartEvent = Extract<SessionEvent, {
    type: 'turn/start';
}>;
/** Current open turn plus the events accepted after its start boundary. */
export interface GoalToolExecution {
    readonly agent: Agent;
    readonly start: TurnStartEvent;
    readonly events: readonly SessionEvent[];
}
/** Hard authority granted to one state-changing call. */
export type GoalToolAuthority = {
    readonly kind: 'direct-human';
} | {
    readonly kind: 'goal-round';
    readonly goal: GoalView;
};
/**
 * One independent completion gate.
 *
 * Returning `undefined` means this gate allows completion.
 * Returning a non-empty string denies completion with that reason.
 *
 * Gates are intentionally process-local runtime policy. Persistent evidence,
 * audit receipts, blueprint state, tests, etc. are owned by the governance
 * layer that registers the gate.
 */
export type GoalCompletionGate = (execution: GoalToolExecution, authority: Extract<GoalToolAuthority, {
    readonly kind: 'goal-round';
}>) => string | undefined;
/**
 * Register an independent gate that must approve autonomous goal completion.
 *
 * This deliberately does not alter direct-human authority: an explicit human
 * can still control the goal. Autonomous goal rounds, however, fail closed
 * when no gate is installed and fail on the first denying gate.
 *
 * @param ctx - Harness context that owns the completion policy.
 * @param gate - Synchronous independent completion check.
 * @returns Exact disposer for ordered plugin/HMR cleanup.
 */
export declare function registerCompletionGate(ctx: Context, gate: GoalCompletionGate): () => void;
/**
 * Require independent certification before an autonomous goal round may mark
 * the goal complete.
 *
 * Direct-human authority bypasses this check because the human is the owner of
 * the goal state. Autonomous completion is fail-closed:
 *
 * - no registered completion gate => rejected
 * - any gate returns a reason      => rejected
 * - every gate returns undefined   => allowed
 *
 * The actual call to `ctx.goals.complete(...)` remains in `src/index.ts`; that
 * file must invoke this function immediately before performing the terminal
 * state transition.
 */
export declare function requireCompletionCertification(ctx: Context, execution: GoalToolExecution, authority: GoalToolAuthority): void;
/**
 * Resolve and authenticate the calling agent and its driver boundary.
 * @param ctx - Context carrying the live agent registry.
 * @param exec - Tool execution metadata supplied by the registry.
 * @returns The authenticated agent and its current turn window.
 */
export declare function goalToolExecution(ctx: Context, exec: ToolRunContext): GoalToolExecution;
/**
 * Require authority originating in a human message accepted by a runtime root.
 * @param ctx - Context carrying the live agent graph.
 * @param execution - Authenticated current tool execution.
 */
export declare function requireDirectHuman(ctx: Context, execution: GoalToolExecution): void;
/**
 * Resolve completion authority from either direct human input or the exact goal round.
 * @param ctx - Context carrying live agents and goal state.
 * @param execution - Authenticated current tool execution.
 * @returns The direct-human or exact-goal-round authority grant.
 */
export declare function completionAuthority(ctx: Context, execution: GoalToolExecution): GoalToolAuthority;
export {};
//# sourceMappingURL=authority.d.ts.map
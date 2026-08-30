/** Execution-time authority checks for the model-facing goal tools. */
import { HarnessError } from '@deepseek-ai/dsh-llm';
/**
 * Completion gates registered for each Cordis context.
 *
 * WeakMap prevents policy registrations from retaining disposed harness
 * contexts. Multiple gates are monotonic: one denial is enough to reject
 * completion; no later gate can override an earlier denial.
 */
const completionGates = new WeakMap();
/** Throw one structured tool-policy failure. */
function reject(message, code = 'GOAL_TOOL_AUTHORITY_REQUIRED') {
    throw new HarnessError(message, code);
}
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
export function registerCompletionGate(ctx, gate) {
    let gates = completionGates.get(ctx);
    if (gates === undefined) {
        gates = new Set();
        completionGates.set(ctx, gates);
    }
    gates.add(gate);
    return () => {
        const current = completionGates.get(ctx);
        if (current === undefined)
            return;
        current.delete(gate);
        if (current.size === 0)
            completionGates.delete(ctx);
    };
}
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
export function requireCompletionCertification(ctx, execution, authority) {
    if (authority.kind === 'direct-human')
        return;
    const gates = completionGates.get(ctx);
    if (gates === undefined || gates.size === 0) {
        reject('autonomous goal completion requires an installed independent completion gate', 'GOAL_COMPLETION_GATE_MISSING');
    }
    for (const gate of gates) {
        const reason = gate(execution, authority);
        if (reason !== undefined && reason.trim().length > 0) {
            reject(reason, 'GOAL_COMPLETION_NOT_CERTIFIED');
        }
    }
}
/** Locate the open turn enclosing a model tool call. */
function openTurn(agent) {
    const events = agent.session.events;
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const boundary = events[index];
        if (boundary?.type === 'turn/end') {
            reject('goal tools require an open model turn', 'GOAL_TOOL_DRIVER_REQUIRED');
        }
        if (boundary?.type === 'turn/start') {
            return { start: boundary, events: events.slice(index + 1) };
        }
    }
    return reject('goal tools require an open model turn', 'GOAL_TOOL_DRIVER_REQUIRED');
}
/**
 * Resolve and authenticate the calling agent and its driver boundary.
 * @param ctx - Context carrying the live agent registry.
 * @param exec - Tool execution metadata supplied by the registry.
 * @returns The authenticated agent and its current turn window.
 */
export function goalToolExecution(ctx, exec) {
    const agent = exec.agent;
    if (agent === undefined) {
        return reject('goal tools require a calling agent', 'GOAL_TOOL_AGENT_REQUIRED');
    }
    if (ctx.agents.get(agent.id) !== agent || agent.status !== 'running'
        || ctx.agents.currentInitiator() !== agent) {
        return reject('goal tools require the exact live calling agent inside its active driver', 'GOAL_TOOL_DRIVER_REQUIRED');
    }
    return { agent, ...openTurn(agent) };
}
/**
 * Whether host-attested human input appears in the current root-agent turn.
 * An omitted `Agent.followup()` / `steer()` source resolves to `user`, so non-human
 * producers must supply their own source rather than inheriting this authority.
 */
function hasDirectHumanInput(ctx, execution) {
    if (!ctx.agents.roots().includes(execution.agent))
        return false;
    return execution.events.some(event => event.type === 'user/message' && event.data.source.kind === 'user');
}
/** Whether this turn is the current goal's exact admitted round. */
function isMatchingGoalRound(execution, goal) {
    return execution.events.some(event => event.type === 'user/message'
        && event.data.source.kind === 'goal'
        && event.data.source.goalId === goal.id
        && event.data.source.revision === goal.revision
        && event.data.source.round === goal.roundsStarted);
}
/**
 * Require authority originating in a human message accepted by a runtime root.
 * @param ctx - Context carrying the live agent graph.
 * @param execution - Authenticated current tool execution.
 */
export function requireDirectHuman(ctx, execution) {
    if (hasDirectHumanInput(ctx, execution))
        return;
    reject('this goal operation requires a direct human turn on a top-level agent');
}
/**
 * Resolve completion authority from either direct human input or the exact goal round.
 * @param ctx - Context carrying live agents and goal state.
 * @param execution - Authenticated current tool execution.
 * @returns The direct-human or exact-goal-round authority grant.
 */
export function completionAuthority(ctx, execution) {
    if (hasDirectHumanInput(ctx, execution))
        return { kind: 'direct-human' };
    const goal = ctx.goals.get(execution.agent);
    if (goal !== undefined && isMatchingGoalRound(execution, goal)) {
        return { kind: 'goal-round', goal };
    }
    return reject('complete and blocked require a direct human turn or the current goal round');
}
//# sourceMappingURL=authority.js.map
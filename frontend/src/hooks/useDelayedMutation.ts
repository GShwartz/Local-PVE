import { UseMutationResult } from '@tanstack/react-query';

/**
 * Delay strategy (safe):
 * - For mutate (callback style): callbacks fire immediately.
 * - For mutateAsync (promise style): wait `delayMs` AFTER backend response
 *   only if the action is in actionsNeedingDelay.
 */
export function useDelayedMutation<
  TData = unknown,
  TError = unknown,
  TVariables extends { action?: string; vmStatus?: string } = any,
  TContext = unknown
>(
  base: UseMutationResult<TData, TError, TVariables, TContext>,
  actionsNeedingDelay: string[],
  delayMs: number
): UseMutationResult<TData, TError, TVariables, TContext> {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const needsDelay = (vars?: TVariables) => {
    if (!vars || typeof vars.action !== 'string') return false;
    return actionsNeedingDelay.includes(vars.action);
  };

  const mutate: typeof base.mutate = (variables: TVariables, options?: any) => {
    return base.mutate(variables, options);
  };

  const mutateAsync: typeof base.mutateAsync = async (variables: TVariables, options?: any) => {
    const result = await base.mutateAsync(variables, options);
    if (needsDelay(variables)) {
      await sleep(delayMs);
    }
    return result;
  };

  return {
    ...base,
    mutate,
    mutateAsync,
  };
}
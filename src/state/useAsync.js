import { useEffect, useReducer } from 'react';

const initial = { status: 'idle', data: null, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      // Keep the previous data while reloading so views don't flash empty.
      return { ...state, status: 'loading', error: null };
    case 'done':
      return { status: 'ready', data: action.data, error: null };
    case 'fail':
      return { ...state, status: 'error', error: action.error };
    default:
      return state;
  }
}

/**
 * Run an async loader whenever `deps` change. Results of stale runs are ignored.
 * Pass `null` as the loader to stay idle.
 * @template T
 * @param {(() => Promise<T>) | null} load
 * @param {unknown[]} deps
 * @returns {{ status: 'idle' | 'loading' | 'ready' | 'error', data: T | null, error: Error | null }}
 */
export function useAsync(load, deps) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    if (!load) return undefined;
    let cancelled = false;
    dispatch({ type: 'start' });
    load().then(
      (data) => !cancelled && dispatch({ type: 'done', data }),
      (error) => !cancelled && dispatch({ type: 'fail', error }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

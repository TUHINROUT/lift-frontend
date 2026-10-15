import { useState, useCallback, useMemo } from "react";
import { readNotifState, writeNotifState } from "../../utils/salesPortal";

// Per-user read / announced state for the sales notification bell (kept in this browser).
export default function useNotificationStore(uid) {
  const [state, setState] = useState(() => ({ uid, ...readNotifState(uid) }));

  // Re-load when the logged-in user changes (adjusting state during render is the
  // documented pattern for "state that depends on a prop").
  if (state.uid !== uid) {
    setState({ uid, ...readNotifState(uid) });
  }

  const commit = useCallback(
    (patch) => {
      const next = { ...state, ...patch };
      writeNotifState(next.uid, next);
      setState(next);
    },
    [state],
  );

  const read = useMemo(() => new Set(state.read), [state.read]);
  const announced = useMemo(() => new Set(state.announced), [state.announced]);

  const markAnnounced = useCallback(
    (ids) =>
      commit({ announced: Array.from(new Set([...state.announced, ...ids])) }),
    [commit, state.announced],
  );

  // Opening / dismissing / "mark all read": read + announced in ONE write so
  // nothing is lost to a stale snapshot.
  const markSeen = useCallback(
    (ids) =>
      commit({
        read: Array.from(new Set([...state.read, ...ids])),
        announced: Array.from(new Set([...state.announced, ...ids])),
      }),
    [commit, state.read, state.announced],
  );

  // First ever load: everything that already exists counts as "seen", so only
  // genuinely new assignments pop up from now on.
  const baseline = useCallback(
    (ids) =>
      commit({
        baselined: true,
        announced: Array.from(new Set([...state.announced, ...ids])),
      }),
    [commit, state.announced],
  );

  return {
    read,
    announced,
    baselined: state.baselined,
    markSeen,
    markAnnounced,
    baseline,
  };
}

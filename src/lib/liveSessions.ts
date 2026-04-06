type LiveSessionLike = {
  created_at?: string | null;
  ended_at?: string | null;
  started_at?: string | null;
  status?: string | null;
  title?: string | null;
};

const CREATED_WINDOW_MS = 2 * 60 * 60 * 1000;
const STARTED_WINDOW_MS = 60 * 60 * 1000;

const getTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const isBattleTitle = (title?: string | null) => (title || '').toLowerCase().startsWith('battle:');

export const isFreshByWindow = (value: string | null | undefined, windowMs: number) => {
  if (!value) return true;
  const time = getTime(value);
  if (!time) return false;
  return Date.now() - time <= windowMs;
};

export const isActiveStandardLiveSession = <T extends LiveSessionLike>(session: T) => {
  return (
    session.status === 'live' &&
    !session.ended_at &&
    !isBattleTitle(session.title) &&
    isFreshByWindow(session.created_at, CREATED_WINDOW_MS) &&
    isFreshByWindow(session.started_at, STARTED_WINDOW_MS)
  );
};

export const sortNewestFirst = <T extends LiveSessionLike>(sessions: T[]) => {
  return [...sessions].sort((a, b) => getTime(b.created_at || b.started_at) - getTime(a.created_at || a.started_at));
};

export const getActiveStandardLiveSessions = <T extends LiveSessionLike>(sessions: T[]) => {
  return sortNewestFirst(sessions.filter(isActiveStandardLiveSession));
};

export const getMostRecentActiveStandardLiveSession = <T extends LiveSessionLike>(sessions: T[]) => {
  return getActiveStandardLiveSessions(sessions)[0] || null;
};
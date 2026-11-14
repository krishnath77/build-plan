// Where Build Plan's function reads and writes. Everything is under apps/c10/ so it can never touch Anuj's data
// (his allowlist is config/access and his usage counters are usage/..., both at the root).
export const ACCESS_PATH = 'apps/c10/config/access';
export const usagePath = (uid, date) => `apps/c10/usage/${uid}_${date}`;

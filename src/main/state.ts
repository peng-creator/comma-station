import { BehaviorSubject, filter } from 'rxjs';

export const _dbRoot$ = new BehaviorSubject('');
export const dbRoot$ = _dbRoot$.pipe(
    filter(dbRoot => dbRoot !== ''),
)

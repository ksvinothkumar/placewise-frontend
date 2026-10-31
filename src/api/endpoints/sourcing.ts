import { http } from '../http';

export interface BooleanHit {
  id: string;
  name: string;
  title?: string;
  company?: string;
  city?: string;
  exp: number;
  notice: number;
  skills: string[];
  matched?: string[];
  snippet?: string;
  hasResume?: boolean;
  photoAt?: string | null;
}
export interface BooleanResult {
  total: number;
  results: BooleanHit[];
}

export const sourcingApi = {
  base: '/search',
  boolean: (q: string) => http.post<BooleanResult>('/search/boolean', { q }),
};

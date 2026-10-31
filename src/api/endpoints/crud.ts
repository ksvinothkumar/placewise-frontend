import { http } from '../http';

type Query = Record<string, string | number | boolean | null | undefined>;

/** Thin typed wrapper for the conventional REST shape. Areas with extra routes spread this and add their own functions. */
export function crud<T, TCreate = Partial<T>, TUpdate = Partial<T>>(base: string) {
  return {
    base,
    list: (query?: Query) => http.get<T[]>(base, query),
    get: (id: string) => http.get<T>(`${base}/${id}`),
    create: (body: TCreate) => http.post<T>(base, body),
    update: (id: string, body: TUpdate) => http.put<T>(`${base}/${id}`, body),
    remove: (id: string) => http.delete<{ ok: boolean }>(`${base}/${id}`),
  };
}

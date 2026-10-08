export type Proj = { id: string; name: string; updated: number; data: any };
const KEY = 'amc.projects';
export const loadProjects = (): Proj[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const saveProjects = (p: Proj[]): boolean => { try { localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; } };

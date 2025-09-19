// src/ui/status.ts
import { theme } from '../theme';

const parseYMD = (s: string) => new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10));
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

export const getStatusColorByRetirada = (fecha: string | null) => {
  if (!fecha) return '#9e9e9e';
  const today = startOfDay(new Date());
  const f = startOfDay(parseYMD(fecha));
  if (f.getTime() > today.getTime()) return theme.colors.success;   // verde
  if (f.getTime() === today.getTime()) return theme.colors.accent;  // naranja
  return theme.colors.danger;                                       // rojo
};

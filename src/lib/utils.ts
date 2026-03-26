import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MOCK_DATA = [
  { name: 'Jan', revenue: 4500, users: 1200, growth: 12 },
  { name: 'Feb', revenue: 5200, users: 1500, growth: 18 },
  { name: 'Mar', revenue: 4800, users: 1400, growth: -5 },
  { name: 'Apr', revenue: 6100, users: 1800, growth: 25 },
  { name: 'May', revenue: 5900, users: 2100, growth: 8 },
  { name: 'Jun', revenue: 7200, users: 2400, growth: 15 },
];

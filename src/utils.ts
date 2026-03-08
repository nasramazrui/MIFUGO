import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null, currency: string = 'TZS') {
  if (amount === undefined || amount === null || isNaN(amount)) return `${currency} 0`;
  return `${currency} ${amount.toLocaleString()}`;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

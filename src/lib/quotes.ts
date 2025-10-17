import data from './quotes.json';

export type Quote = {
  quote: string;
  author: string;
};

export const quotes: Quote[] = data.quotes;

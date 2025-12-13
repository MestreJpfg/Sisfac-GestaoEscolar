
import data from './escolas.json';

export interface Escola {
  nome: string;
}

export const escolas: Escola[] = data.escolas;

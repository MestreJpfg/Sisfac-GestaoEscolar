
import data from './municipios.json';

export interface Municipio {
  nome: string;
  uf: string;
}

export const municipios: Municipio[] = data.municipios;

'use client';

/**
 * @fileOverview Centralized utilities for academic calculations and data normalization.
 */

/**
 * Normalizes a string for use as a database key or for comparison.
 */
export const normalizeAcademicString = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.trim().toLowerCase()
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòôõ]/g, 'o')
    .replace(/[úùû]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/º/g, '')
    .replace(/\./g, '')
    .replace(/\//g, '-') 
    .replace(/[\[\]*~]/g, '') 
    .replace(/\s+/g, '_');
};

/**
 * Calculates the average of a subject based on its four stages.
 * Prioritizes pre-calculated mediaFinal if available and valid.
 */
export const calculateSubjectAverage = (notas: any): number | null => {
    if (!notas) return null;
    
    // Check if stages are present
    const etapaGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4];
    const validGrades = etapaGrades
        .map(g => {
            if (g === null || g === undefined || String(g).trim() === '') return null;
            const numericGrade = typeof g === 'string' ? parseFloat(g.replace(',', '.')) : g;
            return isNaN(numericGrade) ? null : numericGrade;
        })
        .filter((g): g is number => g !== null);

    if (validGrades.length === 0) {
        return (notas.mediaFinal !== null && notas.mediaFinal !== undefined && !isNaN(notas.mediaFinal)) 
            ? notas.mediaFinal 
            : null;
    }

    return validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
};

/**
 * Calculates the overall average for a school year.
 */
export const calculateAnnualAverage = (boletimAno: any): number => {
    if (!boletimAno || !boletimAno.notas || typeof boletimAno.notas !== 'object') {
        return 0;
    }

    const disciplineKeys = Object.keys(boletimAno.notas);
    const allSubjectAverages: number[] = [];

    disciplineKeys.forEach(key => {
        // Skip metadata fields
        if (['aluno', 'nome', 'rm', 'matricula'].includes(key.toLowerCase())) return;
        
        const average = calculateSubjectAverage(boletimAno.notas[key]);
        if (average !== null) {
            allSubjectAverages.push(average);
        }
    });

    if (allSubjectAverages.length === 0) {
        return 0;
    }

    const sum = allSubjectAverages.reduce((acc, curr) => acc + curr, 0);
    return sum / allSubjectAverages.length;
};

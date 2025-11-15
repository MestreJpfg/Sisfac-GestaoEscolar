export type AppUser = {
  uid: string;
  email: string;
  displayName?: string;
  role: 'Admin' | 'Funcionário' | 'Professor' | 'Aluno' | 'Pais/Responsáveis';
  photoURL?: string;
};

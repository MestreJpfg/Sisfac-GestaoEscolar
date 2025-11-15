import admin from 'firebase-admin';

// Esta função inicializa a aplicação Firebase Admin.
// É essencial para as Server Actions que precisam de interagir com o Firebase com privilégios de administrador.
export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return;
  }

  // A configuração é obtida a partir das variáveis de ambiente padrão do Firebase (GOOGLE_APPLICATION_CREDENTIALS)
  // ou do ambiente de computação (por exemplo, Cloud Functions, App Engine), por isso não passamos argumentos.
  admin.initializeApp();
}

# Sistema de Gestão Escolar

Este é um sistema completo de gestão escolar desenvolvido com NextJS, React, ShadCN UI, Tailwind CSS e Firebase.

## Funcionalidades Principais

- **Dashboard de Alunos**: Visualização, filtros avançados e edição de fichas.
- **Gestão de Notas**: Lançamento de boletins por turma e disciplina.
- **Frequência**: Registo diário e relatórios mensais/individuais.
- **Documentos**: Geração de Declarações de Matrícula, Transferência, Boletins e Históricos Escolares em PDF.
- **Gestão de Servidores**: Cadastro completo de funcionários.
- **Sincronização de Dados**: Importação master que move automaticamente alunos ausentes para "Transferidos".
- **Sistema de Permissões**: Controlo de acesso baseado em perfis (Admin, Secretário, etc.).
- **Centro de Notificações**: Alertas em tempo real para novos registos de utilizadores.

## Guia de Exportação para Git (GitHub/GitLab)

### 1. Configuração Inicial (Apenas na primeira vez)

Se encontrar o erro `remote origin already exists`, utilize o comando de atualização:

```bash
# Se o remote já existir, atualize o URL
git remote set-url origin https://github.com/SEU_UTILIZADOR/REPOSITORIO.git

# Envie pela primeira vez
git add .
git commit -m "Configuração inicial"
git branch -M main
git push -u origin main
```

### 2. Como Atualizar (Para novas mudanças)

Sempre que fizer alterações no código e quiser enviá-las para o GitHub, siga estes 3 passos no terminal:

```bash
# 1. Prepara todos os ficheiros alterados
git add .

# 2. Cria um registo das alterações (escreva uma mensagem curta)
git commit -m "Otimização da dashboard e correções no sistema"

# 3. Envia para o GitHub
git push origin main
```

## Tecnologias Utilizadas

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS.
- **UI Components**: ShadCN UI, Lucide React.
- **Backend**: Firebase Auth, Firestore, Cloud Storage.
- **PDF Generation**: jsPDF, html2canvas.
- **AI**: Genkit (para funcionalidades de inteligência artificial).

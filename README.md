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

## 🚀 Guia de Exportação para o GitHub

Se estiver a ter erros no terminal, siga estas instruções atualizadas:

### 1. Configuração Inicial (Apenas na primeira vez)

Se o terminal disser `remote origin already exists`, utilize o comando de atualização abaixo:

```bash
# 1. Inicia o repositório local
git init

# 2. Configura o endereço do seu GitHub (Substitua pelo seu URL)
# Se der erro de "already exists", use: git remote set-url origin https://github.com/SEU_USER/NOME_REPOSITORIO.git
git remote add origin https://github.com/SEU_USER/NOME_REPOSITORIO.git

# 3. Prepara os ficheiros
git add .

# 4. Cria o primeiro registo
git commit -m "Configuração inicial do sistema"

# 5. Envia para o GitHub
git branch -M main
git push -u origin main
```

### 2. Como Atualizar (Para novas mudanças)

Sempre que fizer alterações e quiser guardá-las no GitHub:

```bash
# 1. Prepara todos os ficheiros alterados (O .gitignore agora impede o envio de lixo)
git add .

# 2. Cria um registo das alterações (escreva uma mensagem curta entre aspas)
git commit -m "Otimização da dashboard e correções no sistema"

# 3. Envia para o GitHub
git push origin main
```

---

## Tecnologias Utilizadas

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS.
- **UI Components**: ShadCN UI, Lucide React.
- **Backend**: Firebase Auth, Firestore, Cloud Storage.
- **PDF Generation**: jsPDF, html2canvas.
- **AI**: Genkit (para funcionalidades de inteligência artificial).

---
© 2024 MestreJp. Desenvolvido para eficiência na gestão escolar.

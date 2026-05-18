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

Se estiver a ter erros no terminal, utilize os comandos abaixo:

### 1. Configuração Inicial (Apenas na primeira vez)

```bash
# 1. Inicia o repositório local
git init

# 2. Configura o endereço do seu GitHub
git remote add origin https://github.com/MestreJpfg/Sisfac-GestaoEscolar.git

# 3. Prepara os ficheiros (O .gitignore agora impede o envio de lixo)
git add .

# 4. Cria o primeiro registo
git commit -m "Configuração inicial do sistema"

# 5. Envia para o GitHub (Se der erro 'rejected', veja a seção 3 abaixo)
git branch -M main
git push -u origin main
```

### 2. Como Atualizar (Para novas mudanças)

Sempre que fizer alterações e quiser guardá-las no GitHub:

```bash
git add .
git commit -m "Descreva aqui o que mudou"
git push origin main
```

### 3. Solução de Erro: [rejected] non-fast-forward

Este erro acontece porque o GitHub tem ficheiros que você não tem localmente. Para resolver, escolha uma das opções abaixo:

**Opção A (Mais rápida - Forçar o envio):**
*Use isto se quiser que o código do seu computador substitua totalmente o que estiver no GitHub.*
```bash
git push -u origin main --force
```

**Opção B (Mais segura - Misturar as versões):**
```bash
git pull origin main --rebase
git push -u origin main
```

---

## Tecnologias Utilizadas

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS.
- **UI Components**: ShadCN UI, Lucide React.
- **Backend**: Firebase Auth, Firestore, Cloud Storage.
- **AI**: Genkit.

---
© 2024 MestreJp. Desenvolvido para eficiência na gestão escolar.
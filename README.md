# QuickDrive — Comandos do dia a dia

Guia rápido com os comandos que vocês vão usar toda vez que forem trabalhar no projeto.

---

## 0. Pegando o projeto pela primeira vez (só uma vez por pessoa/máquina)

⚠️ **Nunca usem o botão "Download ZIP" do GitHub.** O ZIP não traz o histórico do Git, e depois não dá pra usar `git add`, `commit`, `pull` ou `push` — só vai dar erro `not a git repository`.

O certo é **clonar**:

1. No GitHub, na página do repositório, clique no botão verde **Code** → aba **HTTPS** → copie a URL (termina em `.git`).
2. No terminal, na pasta onde querem guardar o projeto, rodem:
   ```
   git clone URL_COPIADA
   ```
3. Entrem na pasta criada (`cd quickdrive`) e sigam a instalação normal (seções 1 e 2 abaixo).

---

## 1. Ligar o backend (Django)

Sempre que for abrir o projeto para trabalhar, dentro da pasta `backend`:

```
cd backend
venv\Scripts\Activate.ps1
python manage.py runserver
```

- O `(venv)` precisa aparecer no início da linha do terminal — se não aparecer, o segundo comando não funcionou.
- Backend sobe em `http://localhost:8000`.
- Se aparecer aviso de "migrações pendentes", rode `python manage.py migrate` antes do `runserver`.

**Se ainda não tiver o venv criado nessa máquina** (primeira vez), antes disso:
```
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 2. Ligar o frontend (React)

Em **outro terminal** (deixe o backend rodando no primeiro), dentro da pasta `frontend`:

```
cd frontend
npm run dev
```

- Frontend sobe em `http://localhost:5173`.
- Se der erro `'vite' não é reconhecido`, rode `npm install` antes (só precisa fazer isso quando o `package.json` mudar ou for a primeira vez nessa máquina).

---

## 3. Salvar e enviar mudanças para o GitHub

Depois de mexer no código, na **raiz do projeto** (onde tem as pastas `backend` e `frontend`):

```
git status
git add .
git commit -m "descreva o que voce fez aqui"
git pull origin main
git push origin main
```

- `git status` — só pra conferir o que vai ser enviado.
- Troque a mensagem do `commit -m` toda vez, descrevendo a mudança feita.
- O `git pull` antes do `push` evita sobrescrever o trabalho dos colegas sem querer.
- Se der conflito no pull, ou erro de login no push, chamem alguém do grupo (ou peçam ajuda) antes de forçar qualquer coisa.

---

### Resumo do fluxo completo de uma sessão de trabalho

1. Abrir 2 terminais.
2. Terminal 1: ativar venv → `runserver` (backend).
3. Terminal 2: `npm run dev` (frontend).
4. Trabalhar no código.
5. No fim: `git add .` → `git commit -m "..."` → `git pull origin main` → `git push origin main`.





---
 
## O ciclo de trabalho do dia a dia
 
Repita esses passos a cada tarefa nova.
 
### 1. Atualize a `main` antes de começar
 
```bash
git checkout main
git pull origin main
```
 
Pular esse passo é a causa mais comum de conflito. Sempre parta da `main` mais recente.
 
### 2. Crie a branch da tarefa
 
```bash
git checkout -b feature/tela-de-login
```
 
### 3. Trabalhe e commite
 
```bash
git status                            # veja o que mudou
git add .                             # ou: git add caminho/do/arquivo
git commit -m "feat: adiciona tela de login"
```
 
Faça commits **pequenos e frequentes**. É mais fácil revisar e mais fácil desfazer.
 
### 4. Mantenha sua branch atualizada (se a tarefa durar mais de um dia)
 
```bash
git checkout main
git pull origin main
git checkout feature/tela-de-login
git merge main
```
 
Isso traz para a sua branch o que o time já mergeou. Resolver um conflito pequeno agora é muito melhor do que um conflito gigante no final.
 
### 5. Envie a branch para o GitHub
 
```bash
git push -u origin feature/tela-de-login
```
 
O `-u` só é necessário no primeiro push da branch. Depois, basta `git push`.
 
### 6. Abra o Pull Request
 
Veja a seção [Abrindo o Pull Request](#abrindo-o-pull-request).
 
### 7. Depois do merge, limpe
 
```bash
git checkout main
git pull origin main
git branch -d feature/tela-de-login       # apaga a branch local
```
 
A branch remota pode ser apagada pelo botão que o GitHub mostra na própria página do PR após o merge.
 
---

# Documentação Técnica — Projeto Integrador Eldercare

> Gerado em 28/04/2026. Descreve o estado da aplicação herdada, sua arquitetura completa e todas as alterações realizadas para colocá-la em funcionamento.

---

## Índice

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Banco de Dados](#3-banco-de-dados)
4. [Backend — Spring Boot](#4-backend--spring-boot)
5. [Frontend — React](#5-frontend--react)
6. [Segurança e Autenticação](#6-segurança-e-autenticação)
7. [Como Rodar Localmente](#7-como-rodar-localmente)
8. [Alterações Realizadas e Justificativas](#8-alterações-realizadas-e-justificativas)

---

## 1. Visão Geral do Projeto

O **Projeto Integrador Eldercare** é uma plataforma digital universitária extensionista desenvolvida na PUC Goiás (curso de ADS). Seu objetivo é auxiliar idosos em seu dia a dia, promovendo autonomia, bem-estar e inclusão digital por meio de:

- **Cadastro de idosos** com dados demográficos e de saúde
- **Questionário de saúde** com 40 perguntas em 8 categorias
- **Geração automática de planos de exercícios** personalizados com base nas respostas
- **Gerenciamento de usuários** da plataforma (idosos, cuidadores, familiares, profissionais de saúde)

O projeto foi iniciado por grupos anteriores e herdado para finalização. Está organizado em uma branch principal chamada `Eldercare`, derivada de `develop`.

---

## 2. Arquitetura Geral

A aplicação segue uma arquitetura de **monolito modular** com separação clara entre frontend e backend, comunicando-se via API REST com autenticação JWT.

```
┌─────────────────────────────────────────────────────────┐
│                     Usuário (Browser)                   │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP (porta 5173)
┌───────────────────────────▼─────────────────────────────┐
│              Frontend — React + Vite                    │
│              http://localhost:5173                      │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API + JWT Bearer Token
                            │ HTTP (porta 8080)
┌───────────────────────────▼─────────────────────────────┐
│              Backend — Spring Boot                      │
│              http://localhost:8080                      │
│                                                         │
│   ┌─────────────────┐   ┌─────────────────────────┐    │
│   │ Módulo Plataforma│   │    Módulo Eldercare      │    │
│   │ (auth + usuários)│   │ (idosos + planos + Q&A) │    │
│   └─────────────────┘   └─────────────────────────┘    │
└───────────────────────────┬─────────────────────────────┘
                            │ JDBC (porta 5433)
┌───────────────────────────▼─────────────────────────────┐
│         PostgreSQL 16 — Docker Container                │
│         localhost:5433 → container:5432                 │
└─────────────────────────────────────────────────────────┘
```

### Estrutura de diretórios

```
Projeto-Integrador/
├── backend/
│   └── src/main/java/br/pucgo/ads/projetointegrador/
│       ├── config/           → SecurityConfig (Spring Security + CORS)
│       ├── eldercare/        → Módulo principal (idosos, exercícios, planos)
│       │   ├── controller/
│       │   ├── domain/       → Entidades JPA
│       │   ├── dto/          → Objetos de entrada/saída da API
│       │   ├── mapper/
│       │   ├── repository/
│       │   └── service/
│       ├── plataforma/       → Módulo de usuários e autenticação
│       │   ├── controller/
│       │   ├── dto/
│       │   ├── entity/
│       │   ├── repository/
│       │   └── service/
│       └── security/         → Filtro JWT e configuração de propriedades
├── frontend/
│   └── src/
│       ├── features/
│       │   ├── auth/         → Tela de login
│       │   ├── eldercare/    → Questionário e geração de plano
│       │   ├── admin/        → Páginas administrativas
│       │   └── grupo1/       → Módulo do grupo 1
│       ├── lib/              → Cliente HTTP (Axios) e chamadas à API
│       ├── layouts/          → AppLayout (navegação autenticada)
│       ├── routes/           → Definição de rotas
│       ├── components/       → Componentes reutilizáveis
│       └── theme/            → Tema Material-UI
├── docker-compose.yml        → PostgreSQL via Docker
├── pom.xml                   → Build Maven
└── mvnw / mvnw.cmd           → Maven wrapper
```

---

## 3. Banco de Dados

**SGBD:** PostgreSQL 16, executado via Docker Compose.

O schema é gerenciado de duas formas:
- O arquivo `backend/src/main/resources/schema.sql` é executado na inicialização (`spring.sql.init.mode=always`)
- O Hibernate também aplica DDL automático (`spring.jpa.hibernate.ddl-auto=update`)

### Tabelas

#### `usuarios` — Módulo Plataforma
Armazena os usuários da plataforma (não os idosos participantes do programa).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL (PK) | Identificador auto-incremental |
| nome | VARCHAR(100) | Nome completo |
| email | VARCHAR(150) UNIQUE | E-mail de acesso |
| telefone | VARCHAR(20) | Telefone de contato |
| data_nascimento | VARCHAR(10) | Data no formato YYYY-MM-DD |
| tipo_usuario | VARCHAR(30) | Enum: IDOSO, CUIDADOR, FAMILIAR, PROFISSIONAL_SAUDE |
| ativo | BOOLEAN | Se o cadastro está ativo |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Última atualização |

#### `ex_participante` — Módulo Eldercare
Representa o idoso que passa pelo questionário e recebe o plano de exercícios.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Identificador único |
| user_id | BIGINT (FK) | Referência opcional ao usuário da plataforma |
| nome | VARCHAR(120) | Nome do idoso |
| data_nascimento | DATE | Data de nascimento |
| sexo | VARCHAR(20) | Enum: MASCULINO, FEMININO, OUTRO |
| email | VARCHAR(255) | E-mail do idoso |
| telefone | VARCHAR(30) | Telefone (opcional) |

#### `ex_pergunta` e `ex_opcao_pergunta`
Estrutura de perguntas e suas opções de resposta (usadas no questionário).

#### `ex_exercicio`
Catálogo de exercícios disponíveis para compor os planos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Identificador único |
| nome | VARCHAR | Nome do exercício |
| descricao | TEXT | Descrição |
| tags | JSONB | Tags para filtragem (ex.: cardio, força, equilíbrio) |

#### `ex_plano`, `ex_dia_plano`, `ex_item_plano`
Hierarquia do plano de exercícios gerado:
- `ex_plano` → plano mensal (FK: participante)
- `ex_dia_plano` → dia da semana dentro do plano (FK: plano)
- `ex_item_plano` → exercício individual do dia (FK: dia_plano + exercicio)

#### `ex_resposta_questionario` e `ex_resposta_usuario`
Armazenam as respostas do questionário respondido pelo idoso.

---

## 4. Backend — Spring Boot

**Tecnologias:** Java 21, Spring Boot 3.5.6, Spring Security, Spring Data JPA, Hibernate, Lombok, JWT (java-jwt 4.4.0), Maven.

### Módulo Plataforma

Responsável pelo cadastro de usuários e pela autenticação JWT.

#### Endpoints

| Método | Rota | Autenticação | Descrição |
|--------|------|--------------|-----------|
| POST | `/api/auth/login` | Pública | Gera token JWT a partir de email |
| POST | `/api/usuarios` | Pública | Cadastra novo usuário |
| GET | `/api/usuarios` | JWT | Lista todos os usuários |
| GET | `/api/usuarios/{id}` | JWT | Busca usuário por ID |
| PUT | `/api/usuarios/{id}` | JWT | Atualiza usuário |
| DELETE | `/api/usuarios/{id}` | JWT | Remove usuário |

#### Como funciona o login

O `AuthController` recebe email e senha, localiza o usuário pelo email no banco e — **sem verificar senha** (a autenticação por senha não foi implementada pelos grupos anteriores) — gera um JWT com o ID do usuário como `subject`. O token retornado é usado em todas as requisições protegidas.

#### Tipos de usuário (enum `TipoUsuario`)
- `IDOSO` — o próprio idoso acessando a plataforma
- `CUIDADOR` — responsável pelo cuidado do idoso
- `FAMILIAR` — familiar do idoso
- `PROFISSIONAL_SAUDE` — médico, fisioterapeuta, etc.

### Módulo Eldercare

Núcleo funcional da aplicação. Gerencia idosos participantes, questionários e geração de planos de exercícios.

#### Endpoints

| Método | Rota | Autenticação | Descrição |
|--------|------|--------------|-----------|
| GET | `/api/eldercare/ping` | Pública | Health check |
| POST | `/api/eldercare/idosos` | JWT | Cadastra idoso participante |
| GET | `/api/eldercare/idosos` | JWT | Lista idosos |
| POST | `/api/eldercare/idosos/ensure` | JWT | Busca ou cria idoso por email (SSO) |
| POST | `/api/eldercare/questionario/gerar` | JWT | Recebe respostas e gera plano |
| GET | `/api/eldercare/planos/{id}` | JWT | Busca plano gerado |

#### Fluxo principal

```
1. Cadastro do idoso (POST /api/eldercare/idosos)
        ↓
2. Resposta ao questionário com 40 perguntas em 8 categorias
        ↓
3. Geração do plano (POST /api/eldercare/questionario/gerar)
        ↓
4. PlanoService analisa respostas → determina nível (BAIXO/MÉDIO/ALTO)
        ↓
5. Plano gerado com dias da semana e exercícios personalizados
        ↓
6. Resposta com JSON do plano → exibida no frontend
```

#### As 8 categorias do questionário

| Categoria | Perguntas |
|-----------|-----------|
| Condição física geral | Cansaço, mobilidade, frequência de atividade, dores |
| Saúde cardiovascular | Hipertensão, problemas cardíacos, falta de ar, medicação |
| Força, equilíbrio e postura | Insegurança ao caminhar, quedas, levantar sem apoio |
| Flexibilidade e coordenação | Alcance dos pés, rigidez, alongamento, coordenação |
| Hábitos e estilo de vida | Tabagismo, álcool, alimentação, sono, atividades ao ar livre |
| Saúde mental e social | Solidão, grupos sociais, estresse, depressão |
| Objetivos e preferências | Objetivo do treino, preferência social, intensidade, local |
| Disponibilidade e rotina | Dias por semana, tempo por dia, equipamentos disponíveis |

### Configurações principais (`application.properties`)

```properties
spring.datasource.url=jdbc:postgresql://localhost:5433/projeto_integrador
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.jpa.hibernate.ddl-auto=update
spring.sql.init.mode=always
server.port=8080
security.jwt.secret=CHANGEME-SUPER-SECRET-KEY-32-CHARS-MIN
security.jwt.issuer=pi-eldercare
```

> **Atenção:** O segredo JWT está em texto plano no arquivo de configuração. Em produção, deve ser movido para variável de ambiente.

---

## 5. Frontend — React

**Tecnologias:** React 19, TypeScript, Vite, React Router DOM 7, TanStack React Query, Material-UI (MUI) 7, Axios, Zod.

### Rotas

| Rota | Componente | Autenticação |
|------|------------|--------------|
| `/` | LoginPage | Pública |
| `/home` | ModuleGrid | Protegida |
| `/eldercare/questionario` | QuestionarioDemo | Protegida |
| `/admin/*` | Páginas Admin | Protegida |
| `/usuarios` | Lista de usuários | Protegida |

### Módulo de Autenticação (`features/auth`)

Tela de login com campos de e-mail e senha. Após autenticação bem-sucedida, o token JWT é armazenado e o usuário é redirecionado para `/home`.

### Módulo Eldercare (`features/eldercare/QuestionarioDemo.tsx`)

Componente de fluxo em 3 etapas:

**Etapa 1 — Cadastro do Idoso**
Formulário com nome, data de nascimento, sexo, e-mail e telefone (opcional). Ao submeter, chama `POST /api/eldercare/idosos` e avança para o questionário.

**Etapa 2 — Questionário (wizard de 8 telas)**
Exibe 5 perguntas por tela, com barra de progresso e navegação entre categorias. Respostas são armazenadas localmente em estado React.

**Etapa 3 — Plano Gerado**
Envia todas as respostas para `POST /api/eldercare/questionario/gerar` e exibe o plano resultante: nível, semanas, dias por semana, minutos por dia e exercícios por dia da semana. Permite imprimir ou baixar em JSON.

### Cliente HTTP (`lib/http.ts`)

Instância do Axios com:
- `baseURL` apontando para `VITE_API_URL` (padrão: `http://localhost:8080`)
- Interceptor de request que adiciona o header `Authorization: Bearer <token>`

### Variáveis de ambiente (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8080
VITE_USE_PLATFORM_PROFILE=true
```

---

## 6. Segurança e Autenticação

### Fluxo JWT

```
1. POST /api/auth/login  { email, senha }
        ↓
2. Backend localiza usuário pelo email
        ↓
3. Gera JWT assinado com HMAC-SHA256
   payload: { iss: "pi-eldercare", sub: "<userId>" }
        ↓
4. Frontend recebe token e armazena
        ↓
5. Todas as requisições protegidas enviam:
   Authorization: Bearer <token>
        ↓
6. JwtAuthFilter valida o token e autentica a requisição
```

### Rotas públicas (sem token)

- `POST /api/auth/login`
- `POST /api/usuarios`
- `GET /api/eldercare/ping`
- Swagger e Actuator health

### CORS

Configurado para aceitar requisições de qualquer porta em `localhost` ou `127.0.0.1`, cobrindo o dev server do Vite.

---

## 7. Como Rodar Localmente

### Pré-requisitos

- Java 21
- Docker Desktop
- Node.js 18+

### Passo a passo

```bash
# 1. Banco de dados (PostgreSQL via Docker)
docker-compose up -d

# 2. Backend (em outro terminal, na raiz do projeto)
./mvnw spring-boot:run

# 3. Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Banco: localhost:5433

### Usuário de teste

```
Email: admin@teste.com
Senha: 123456
Tipo:  PROFISSIONAL_SAUDE
```

Para criar via API (se necessário):
```bash
curl -X POST http://localhost:8080/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Teste",
    "email": "admin@teste.com",
    "telefone": "11999999999",
    "dataNascimento": "1990-01-01",
    "tipoUsuario": "PROFISSIONAL_SAUDE"
  }'
```

---

## 8. Alterações Realizadas e Justificativas

### Problema 1 — Conflito de porta com PostgreSQL local

**Arquivo:** `docker-compose.yml` e `backend/src/main/resources/application.properties`

**Situação antes:**
O `docker-compose.yml` mapeava a porta do container PostgreSQL para a porta `5432` do host:
```yaml
ports:
  - "5432:5432"
```
E o `application.properties` apontava para essa mesma porta:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/projeto_integrador
```

**O problema:**
A máquina já possuía uma instalação local do PostgreSQL (processo `postgres.exe`, PID 6704) rodando na porta `5432`. Quando o Docker tentava usar a mesma porta, havia dois processos escutando simultaneamente. O backend conectava no PostgreSQL local (que tinha credenciais diferentes), resultando no erro:
```
FATAL: autenticação do tipo senha falhou para o usuário "postgres"
```

**Solução aplicada:**
Mover o container Docker para a porta `5433`, evitando o conflito:

`docker-compose.yml`:
```yaml
# Antes
- "5432:5432"

# Depois
- "5433:5432"
```

`application.properties`:
```properties
# Antes
spring.datasource.url=jdbc:postgresql://localhost:5432/projeto_integrador

# Depois
spring.datasource.url=jdbc:postgresql://localhost:5433/projeto_integrador
```

---

### Problema 2 — LoginForm era um mock que não chamava a API

**Arquivo:** `frontend/src/features/auth/components/LoginForm.tsx`

**Situação antes:**
O formulário de login simulava autenticação com um `setTimeout` e definia um token falso (`demo-token`) hardcoded. Os campos de e-mail e senha eram capturados pelo formulário mas **ignorados completamente**. Qualquer combinação de credenciais "funcionava":

```typescript
// Código original
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  try {
    // Mock de autenticação: em produção, chame a API.
    await new Promise((r) => setTimeout(r, 500));
    setAuthToken('demo-token');
    enqueueSnackbar('Login realizado com sucesso!', { variant: 'success' });
    navigate('/home', { replace: true });
  } catch (err) { ... }
}
```

**O problema:**
Com o token `demo-token`, todas as requisições autenticadas ao backend retornavam `401 Unauthorized` ou `403 Forbidden`, pois o filtro JWT rejeitava tokens inválidos.

**Solução aplicada:**
Substituído o mock por uma chamada real à API de autenticação:

```typescript
// Código corrigido
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password }),
    });
    if (!res.ok) throw new Error('Credenciais inválidas');
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setAuthToken(data.token);
    enqueueSnackbar('Login realizado com sucesso!', { variant: 'success' });
    navigate('/home', { replace: true });
  } catch (err) {
    enqueueSnackbar('Falha ao autenticar. Verifique e-mail e senha.', { variant: 'error' });
  }
}
```

---

### Problema 3 — Token JWT não persistia entre navegações de página

**Arquivo:** `frontend/src/lib/http.ts`

**Situação antes:**
O token era armazenado apenas em uma variável de módulo em memória:

```typescript
// Código original
let token: string | null = null;
export function setAuthToken(t: string | null) { token = t; }
```

**O problema:**
Ao navegar entre páginas no React Router, o módulo não era reinicializado (SPA), então o token sobrevivia durante a sessão. Porém, ao recarregar a página (F5) ou acessar diretamente uma URL protegida, o módulo era reinicializado com `token = null`, causando falha silenciosa nas requisições autenticadas.

**Solução aplicada:**
Inicializar lendo do `localStorage` e persistir ao setar:

```typescript
// Código corrigido
let token: string | null = localStorage.getItem('token');
export function setAuthToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}
```

---

### Problema 4 — QuestionarioDemo não enviava o token JWT nas requisições

**Arquivo:** `frontend/src/features/eldercare/QuestionarioDemo.tsx`

**Situação antes:**
O componente `QuestionarioDemo` definia sua própria função `apiPost` usando `fetch` nativo, sem incluir o header de autorização:

```typescript
// Código original
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
```

**O problema:**
Os endpoints `/api/eldercare/idosos` e `/api/eldercare/questionario/gerar` exigem autenticação JWT (conforme `SecurityConfig`). Sem o header `Authorization: Bearer <token>`, o backend retornava `403 Forbidden` ou `404` (dependendo de como o Spring Security tratava a requisição não autenticada), bloqueando o fluxo inteiro do Eldercare.

**Solução aplicada:**
Ler o token do `localStorage` e incluí-lo no header de todas as requisições:

```typescript
// Código corrigido
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
```

---

### Problema 5 — Campo `telefone` obrigatório bloqueava cadastro de idoso

**Arquivo:** `backend/src/main/java/br/pucgo/ads/projetointegrador/eldercare/dto/CriarIdosoDTO.java`

**Situação antes:**
O DTO de criação de idoso marcava o campo `telefone` como `@NotBlank`, tornando-o obrigatório na API:

```java
// Código original
@NotBlank
@Pattern(
    regexp = "^(?:\\+?55\\s?)?\\(?\\d{2}\\)?\\s?(?:9\\d{4}|\\d{4})-?\\d{4}$",
    message = "telefone deve estar no formato BR, ex.: (62) 99999-0000"
)
String telefone
```

**O problema:**
O formulário de cadastro do frontend (`QuestionarioDemo.tsx`) trata o telefone como campo opcional. Quando o usuário não preenchia o telefone, o frontend enviava `null` e o backend retornava:

```json
{
  "status": 400,
  "error": "Validation Error",
  "message": "telefone: não deve estar em branco"
}
```

**Solução aplicada:**
Remover a anotação `@NotBlank`, mantendo apenas o `@Pattern` para validar o formato quando o valor for informado. A anotação `@Pattern` ignora valores `null` por padrão no Bean Validation:

```java
// Código corrigido
@Pattern(
    regexp = "^(?:\\+?55\\s?)?\\(?\\d{2}\\)?\\s?(?:9\\d{4}|\\d{4})-?\\d{4}$",
    message = "telefone deve estar no formato BR, ex.: (62) 99999-0000"
)
String telefone
```

---

## Resumo das Alterações

| # | Arquivo | Tipo | Descrição |
|---|---------|------|-----------|
| 1 | `docker-compose.yml` | Configuração | Porta do PostgreSQL: 5432 → 5433 |
| 2 | `application.properties` | Configuração | URL do banco atualizada para porta 5433 |
| 3 | `LoginForm.tsx` | Bug crítico | Login mock substituído por chamada real à API |
| 4 | `http.ts` | Bug | Token passou a ser persistido no localStorage |
| 5 | `QuestionarioDemo.tsx` | Bug crítico | JWT adicionado ao header das requisições |
| 6 | `CriarIdosoDTO.java` | Bug | Campo telefone deixou de ser obrigatório |

---

*Documentação gerada durante sessão de análise e correção do projeto em 28/04/2026.*

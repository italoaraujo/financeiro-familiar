# Biometria e Passkeys no PWA Design

**Spec**: `.specs/features/biometria-passkeys/spec.md`  
**Status**: Approved

---

## Architecture Overview

A arquitetura implementa autenticação FIDO2 / WebAuthn através das bibliotecas `@simplewebauthn/server` no NestJS e `@simplewebauthn/browser` no Next.js 14 PWA. O fluxo é dividido entre:
1. **Registro**: usuário autenticado aciona a criação de credencial biométrica de plataforma vinculada à sua conta.
2. **Login**: usuário na tela inicial do PWA clica em "Entrar com Biometria", o dispositivo assina um desafio criptográfico temporário, e a API valida a assinatura emitindo o JWT padrão.

```mermaid
graph TD
    subgraph Cliente [PWA no Dispositivo Móvel]
        UI[Tela /login ou Configurações]
        HOOK[useBiometrics Hook]
        BROWSER[@simplewebauthn/browser]
        HARDWARE[Hardware Biométrico / Secure Enclave]
    end

    subgraph Servidor [NestJS API REST]
        CTRL[PasskeyController]
        SERV[PasskeyService]
        FIDO[@simplewebauthn/server]
        AUTH[AuthService / JwtService]
    end

    subgraph Banco [PostgreSQL]
        UP[user_passkeys]
        AC[auth_challenges]
        USERS[users]
    end

    UI --> HOOK
    HOOK --> BROWSER
    BROWSER --> HARDWARE
    HOOK --> CTRL
    CTRL --> SERV
    SERV --> FIDO
    SERV --> UP
    SERV --> AC
    SERV --> AUTH
    UP --> USERS
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `AuthService` | `backend/src/modules/auth/auth.service.ts` | Reutilizar método de geração de JWT (`jwtService.sign`) e busca de usuário para compatibilidade idêntica de token |
| `JwtAuthGuard` & `GetUser` | `backend/src/common/guards/jwt-auth.guard.ts` | Proteger endpoints de registro de biometria e listagem/revogação de credenciais |
| `ThrottlerGuard` | `backend/src/modules/auth/auth.controller.ts` | Reutilizar rate limiting `@Throttle({ default: { limit: 5, ttl: 60000 } })` nas rotas de login biométrico |
| `api.ts` (`apiRequest`) | `frontend/src/lib/api.ts` | Chamadas HTTP padronizadas com tratamento de erro e serialização JSON |
| `AuthContext` | `frontend/src/context/AuthContext.tsx` | Armazenamento de sessão (`financial_token`, `financial_user`, cookies seguros) pós-login com biometria |
| `AppShell` / `Modal` | `frontend/src/components/` | Padrões de interface e feedbacks com `lucide-react` |

### Integration Points

| System | Integration Method |
| --- | --- |
| `PrismaService` | Injeção de dependência padrão do NestJS para manipulação de `user_passkeys` e `auth_challenges` |
| `Next.js PWA` | Detecção condicional via `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` sem afetar SSR |

---

## Components

### `PasskeyService`

- **Purpose**: Orquestrar a geração de desafios FIDO2, validação criptográfica de registro e login e gestão de credenciais.
- **Location**: `backend/src/modules/auth/passkey.service.ts`
- **Interfaces**:
  - `generateRegistrationOptions(userId: string, userEmail: string): Promise<PublicKeyCredentialCreationOptionsJSON>`
  - `verifyRegistration(userId: string, body: RegistrationResponseJSON): Promise<{ success: boolean; credentialId: string }>`
  - `generateAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON>`
  - `verifyAuthentication(body: AuthenticationResponseJSON): Promise<{ user: any; accessToken: string }>`
  - `listUserCredentials(userId: string): Promise<any[]>`
  - `deleteCredential(userId: string, credentialId: string): Promise<void>`
- **Dependencies**: `PrismaService`, `JwtService`, `@simplewebauthn/server`
- **Reuses**: Formato de resposta de autenticação de `AuthService.login`

### `PasskeyController`

- **Purpose**: Expor endpoints HTTP para registro, login e gerenciamento de credenciais biométricas.
- **Location**: `backend/src/modules/auth/passkey.controller.ts`
- **Interfaces**:
  - `POST /auth/passkey/register-options` (autenticado)
  - `POST /auth/passkey/register-verify` (autenticado)
  - `POST /auth/passkey/login-options` (público, throttled)
  - `POST /auth/passkey/login-verify` (público, throttled)
  - `GET /auth/passkey/credentials` (autenticado)
  - `DELETE /auth/passkey/credentials/:id` (autenticado)
- **Dependencies**: `PasskeyService`
- **Reuses**: `JwtAuthGuard`, `GetUser`, `@Throttle`

### `useBiometrics` (Hook Frontend)

- **Purpose**: Encapsular a detecção de hardware biométrico no dispositivo móvel e comunicação com WebAuthn.
- **Location**: `frontend/src/hooks/useBiometrics.ts`
- **Interfaces**:
  - `isSupported: boolean`
  - `registerBiometrics(deviceName?: string): Promise<boolean>`
  - `loginWithBiometrics(): Promise<boolean>`
  - `listCredentials(): Promise<any[]>`
  - `removeCredential(id: string): Promise<void>`
- **Dependencies**: `@simplewebauthn/browser`, `api.ts`, `AuthContext`
- **Reuses**: `apiRequest`, `AuthContext.login`

---

## Data Models

### `UserPasskey` (Prisma)

```prisma
model UserPasskey {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  credentialId String    @unique @map("credential_id") @db.VarChar(500)
  publicKey    Bytes     @map("public_key")
  counter      BigInt    @default(0)
  transports   String[]  @default([])
  deviceName   String?   @map("device_name") @db.VarChar(100)
  deviceType   String?   @map("device_type") @db.VarChar(50)
  backedUp     Boolean   @default(false) @map("backed_up")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  lastUsedAt   DateTime? @map("last_used_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_passkeys")
}
```

### `AuthChallenge` (Prisma)

```prisma
model AuthChallenge {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  challenge String   @unique @db.VarChar(255)
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("auth_challenges")
}
```

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Dispositivo sem biometria | Hook detecta `isUserVerifyingPlatformAuthenticatorAvailable() === false` | Botão biométrico não é exibido; fluxo de e-mail/senha segue padrão |
| Desafio expirado (> 5 min) | API lança `UnauthorizedException('Desafio de autenticação expirado ou inválido')` | Mensagem: "Tempo limite esgotado. Tente novamente." |
| Assinatura ou credencial corrompida | API lança `UnauthorizedException('Credencial biométrica inválida')` | Mensagem: "Não foi possível validar a biometria. Use seu e-mail e senha." |
| Replay attack (`counter <= lastCounter`) | API bloqueia e lança `UnauthorizedException` | Sessão recusada imediatamente protegendo o usuário |
| Usuário cancela prompt no celular | Hook captura exceção `NotAllowedError` sem propagar erro fatal | Retorna silenciosamente ao formulário sem travar |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| --- | --- | --- | --- |
| `rpID` incompatível em dev vs prod | `passkey.service.ts` | WebAuthn rejeita origens não correspondentes | Parametrizar `RP_ID` via env (`localhost` por padrão em dev, domínio de produção quando configurado) |
| BigInt serialização JSON | Prisma model `counter` | Erro `TypeError: Do not know how to serialize a BigInt` | Converter explicitamente `counter: Number(record.counter)` ou string nos DTOs retornados |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Biblioteca FIDO2 | `@simplewebauthn/server` & `@simplewebauthn/browser` | Padrão oficial de mercado mantido por membros da FIDO Alliance, TypeScript nativo e sem dependências nativas pesadas |
| RP ID dinâmico | `process.env.RP_ID || 'localhost'` | Permite funcionamento plug-and-play tanto em contêiner/localhost quanto em domínio de produção com HTTPS |
| Tabela de challenges no banco | `AuthChallenge` com TTL de 5 minutos | Elimina dependência de Redis e garante funcionamento multi-instância e após restarts |

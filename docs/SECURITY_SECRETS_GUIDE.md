# Guia de Rotação de Segredos e Hardening de Credenciais

## 1. Visão Geral e Objetivos

Este documento estabelece as diretrizes de segurança, governança de credenciais e procedimentos operacionais padrão (SOP) para o gerenciamento do ciclo de vida de segredos criptográficos no sistema **Financeiro Familiar**.

A proteção e a rotação periódica de credenciais mitigam o impacto de potenciais exposições acidentais, vazamento em backups ou comprometimento de tokens históricos, garantindo a conformidade com as melhores práticas de DevSecOps, OWASP e LGPD.

---

## 2. Geração Criptograficamente Segura de Segredos

Segredos de aplicação e senhas de infraestrutura nunca devem ser gerados manualmente, baseados em palavras do dicionário ou derivados de informações contextuais.

### 2.1. Geração com OpenSSL (Recomendado)

Para gerar uma chave com alta entropia (256 bits / 32 bytes):

```bash
# Formato Base64 (ideal para JWT_SECRET)
openssl rand -base64 32

# Formato Hexadecimal (64 caracteres)
openssl rand -hex 32
```

### 2.2. Geração via Node.js Crypto

Caso o ambiente não disponha do OpenSSL CLI:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Diretrizes de Rotação Periódica de Segredos

Recomenda-se a realização de rotação de segredos:
- **Rotina Periódica**: A cada 90 dias para senhas de banco e chaves de sessão.
- **Sob Demanda (Imediata)**: Sempre que houver desligamento de membros com acesso administrativo, suspeita de comprometimento, commits acidentais ou alertas de auditoria.

### 3.1. Rotação do `JWT_SECRET`

O segredo `JWT_SECRET` é utilizado pelo NestJS para assinar e validar tokens de autenticação (JWT) e cookies de sessão.

#### Impacto da Rotação
Ao alterar o `JWT_SECRET`, todos os tokens e sessões ativas previamente emitidos se tornarão imediatamente inválidos (erro `401 Unauthorized`), exigindo que todos os usuários façam novo login.

#### Procedimento de Rotação
1. Gere um novo segredo forte:
   ```bash
   NEW_JWT_SECRET=$(openssl rand -base64 32)
   ```
2. No ambiente de produção ou servidor de hospedagem, atualize o arquivo `.env`:
   ```bash
   # Substitua a variável JWT_SECRET pelo novo valor
   sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT_SECRET}/" .env
   ```
3. Reinicie o contêiner ou serviço da API backend:
   ```bash
   docker compose restart api
   ```
4. Verifique os logs da aplicação para confirmar a inicialização correta:
   ```bash
   docker compose logs --tail=50 -f api
   ```
5. Teste o fluxo de autenticação realizando um login via frontend ou API.

---

### 3.2. Rotação de Credenciais do Banco de Dados PostgreSQL

#### Procedimento de Rotação em Produção
1. Gere uma nova senha complexa:
   ```bash
   NEW_DB_PASSWORD=$(openssl rand -base64 24)
   ```
2. Conecte-se ao banco de dados PostgreSQL com privilégios administrativos e altere a senha do usuário:
   ```sql
   ALTER USER financial_user WITH PASSWORD 'NOVA_SENHA_AQUI';
   ```
3. Atualize as variáveis no `.env` do servidor:
   - `DB_PASSWORD`
   - `DATABASE_URL` (garantindo que a nova senha com caracteres especiais esteja devidamente escapada via URL encoding se necessário)
4. Reinicie os serviços que dependem da conexão com o banco:
   ```bash
   docker compose restart api
   ```
5. Valide a integridade da conexão conferindo o healthcheck:
   ```bash
   docker compose ps
   docker compose logs --tail=50 api
   ```

---

## 4. Prevenção de Vazamentos no Versionamento (Git)

### 4.1. Regras de `.gitignore`
- O arquivo `.env` e variações (`.env.local`, `.env.production`, `.env.*.local`) **nunca** devem ser comitados no Git.
- Apenas arquivos de modelo (`.env.example`) são versionados.

### 4.2. Padrão para Arquivos `.env.example`
- O arquivo `.env.example` deve conter apenas variáveis com descrições ou placeholders genéricos (ex: `substitua_por_uma_senha_forte_de_banco`).
- **Nenhum** valor real de teste, chave privada ou senha válida pode constar no `.env.example`.

### 4.3. Instalação de Scanners de Pré-Commit (Recomendado)
Para evitar que segredos sejam acidentalmente enviados ao repositório, recomenda-se a instalação de ferramentas como `gitleaks` ou `git-secrets`:

```bash
# Execução local com Docker via Gitleaks
docker run -v $(pwd):/path zricethezav/gitleaks:latest detect --source="/path" -v
```

---

## 5. Hardening no Servidor de Produção

1. **Permissões de Arquivo Restritivas**:
   Garanta que apenas o usuário da aplicação possa ler o arquivo `.env`:
   ```bash
   chmod 600 .env
   chown deploy:deploy .env
   ```
2. **Uso de Secret Managers**:
   Para implantações corporativas em nuvem (AWS, GCP, Azure, Kubernetes), prefira injetar segredos dinamicamente a partir de cofres seguros (AWS Secrets Manager, HashiCorp Vault, Doppler) em vez de persistir arquivos `.env` estáticos em disco.
3. **Auditoria de Acesso**:
   Monitore acessos ao servidor e retenha logs de modificação de arquivos de configuração sensíveis.

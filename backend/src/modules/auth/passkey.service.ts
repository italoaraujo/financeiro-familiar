import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PasskeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getRpId(): string {
    return process.env.RP_ID || 'localhost';
  }

  private getRpName(): string {
    return process.env.RP_NAME || 'Financeiro Familiar';
  }

  private getExpectedOrigins(): string[] {
    const allowed = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
      : [];
    const origins = new Set<string>([
      'http://localhost:3000',
      'http://localhost:3001',
      ...allowed,
    ]);
    const rpId = this.getRpId();
    if (rpId && rpId !== 'localhost') {
      origins.add(`https://${rpId}`);
    }
    return Array.from(origins);
  }

  async generateRegistrationOptions(userId: string, email: string) {
    // Limpar desafios expirados
    await this.prisma.authChallenge.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    const existingPasskeys = await this.prisma.userPasskey.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName: this.getRpName(),
      rpID: this.getRpId(),
      userID: new Uint8Array(Buffer.from(userId, 'utf-8')),
      userName: email,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialId,
        transports: (p.transports as any) || undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Salvar o desafio no banco com validade de 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.authChallenge.create({
      data: {
        userId,
        challenge: options.challenge,
        expiresAt,
      },
    });

    return options;
  }

  async verifyRegistration(userId: string, body: any) {
    if (!body || !body.response) {
      throw new BadRequestException('Resposta biométrica inválida ou ausente');
    }

    // Buscar o desafio ativo mais recente para este usuário
    const challengeRecord = await this.prisma.authChallenge.findFirst({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challengeRecord) {
      throw new UnauthorizedException('Desafio de registro biométrico expirado ou inválido');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: this.getExpectedOrigins(),
        expectedRPID: this.getRpId(),
      });
    } catch (error: any) {
      throw new UnauthorizedException(`Falha na validação criptográfica da biometria: ${error.message || 'Erro desconhecido'}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('A credencial biométrica não pôde ser confirmada');
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Remover o desafio utilizado
    await this.prisma.authChallenge.delete({
      where: { id: challengeRecord.id },
    }).catch(() => null);

    const transports = body.response?.transports || [];
    const deviceName = body.deviceName || 'Dispositivo Móvel';

    const savedPasskey = await this.prisma.userPasskey.create({
      data: {
        userId,
        credentialId: credentialID,
        publicKey: Buffer.from(credentialPublicKey),
        counter: BigInt(counter),
        transports,
        deviceName,
        deviceType: verification.registrationInfo.deviceType || 'singleDevice',
        backedUp: verification.registrationInfo.backedUp || false,
      },
    });

    return {
      verified: true,
      credentialId: savedPasskey.credentialId,
      deviceName: savedPasskey.deviceName,
    };
  }

  async generateAuthenticationOptions() {
    // Limpar desafios expirados
    await this.prisma.authChallenge.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    const options = await generateAuthenticationOptions({
      rpID: this.getRpId(),
      userVerification: 'preferred',
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.authChallenge.create({
      data: {
        userId: null,
        challenge: options.challenge,
        expiresAt,
      },
    });

    return options;
  }

  async verifyAuthentication(body: any) {
    if (!body || !body.id || !body.response) {
      throw new BadRequestException('Dados de autenticação biométrica inválidos');
    }

    // 1. Localizar a credencial cadastrada
    const passkey = await this.prisma.userPasskey.findUnique({
      where: { credentialId: body.id },
      include: {
        user: {
          include: {
            memberships: {
              include: { family: true },
            },
          },
        },
      },
    });

    if (!passkey || !passkey.user) {
      throw new UnauthorizedException('Credencial biométrica não reconhecida ou revogada');
    }

    // 2. Extrair o challenge de clientDataJSON
    let clientChallenge: string | null = null;
    try {
      const clientDataJSONStr = Buffer.from(body.response.clientDataJSON, 'base64url').toString('utf-8');
      const clientData = JSON.parse(clientDataJSONStr);
      clientChallenge = clientData.challenge;
    } catch {
      throw new BadRequestException('Estrutura de dados do cliente corrompida');
    }

    if (!clientChallenge) {
      throw new UnauthorizedException('Desafio não identificado na assinatura do cliente');
    }

    // 3. Buscar desafio ativo no banco
    const challengeRecord = await this.prisma.authChallenge.findUnique({
      where: { challenge: clientChallenge },
    });

    if (!challengeRecord || challengeRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Desafio de autenticação biométrica expirado ou inválido');
    }

    // 4. Verificar resposta com @simplewebauthn/server
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: this.getExpectedOrigins(),
        expectedRPID: this.getRpId(),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
          transports: passkey.transports as any,
        },
      });
    } catch (error: any) {
      throw new UnauthorizedException(`Assinatura biométrica inválida: ${error.message || 'Falha de verificação'}`);
    }

    if (!verification.verified) {
      throw new UnauthorizedException('Assinatura biométrica não pôde ser verificada');
    }

    const { newCounter } = verification.authenticationInfo;

    // 5. Prevenção de Replay Attack (se counter > 0 e não incrementou)
    if (newCounter <= Number(passkey.counter) && Number(passkey.counter) > 0) {
      throw new UnauthorizedException('Possível replay attack detectado no dispositivo');
    }

    // 6. Atualizar counter e lastUsedAt
    await this.prisma.userPasskey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(newCounter),
        lastUsedAt: new Date(),
      },
    });

    // 7. Deletar desafio consumido
    await this.prisma.authChallenge.delete({
      where: { id: challengeRecord.id },
    }).catch(() => null);

    // 8. Gerar JWT idêntico ao login padrão
    const token = this.jwtService.sign({
      sub: passkey.user.id,
      email: passkey.user.email,
    });

    return {
      user: {
        id: passkey.user.id,
        name: passkey.user.name,
        email: passkey.user.email,
        avatarUrl: passkey.user.avatarUrl,
        memberships: passkey.user.memberships || [],
      },
      accessToken: token,
    };
  }

  async listUserCredentials(userId: string) {
    const passkeys = await this.prisma.userPasskey.findMany({
      where: { userId },
      select: {
        id: true,
        credentialId: true,
        deviceName: true,
        deviceType: true,
        createdAt: true,
        lastUsedAt: true,
        counter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return passkeys.map((p) => ({
      ...p,
      counter: Number(p.counter),
    }));
  }

  async deleteCredential(userId: string, credentialId: string) {
    const passkey = await this.prisma.userPasskey.findFirst({
      where: {
        id: credentialId,
        userId,
      },
    });

    if (!passkey) {
      throw new NotFoundException('Credencial biométrica não encontrada');
    }

    await this.prisma.userPasskey.delete({
      where: { id: passkey.id },
    });

    return { message: 'Credencial biométrica removida com sucesso' };
  }
}

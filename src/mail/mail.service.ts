import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: BrevoClient;
  private readonly from: { name: string; email: string };

  constructor(private readonly config: ConfigService) {
    this.client = new BrevoClient({
      apiKey: this.config.get<string>('BREVO_API_KEY') ?? '',
    });
    this.from = {
      name: this.config.get<string>('MAIL_FROM_NAME', 'Repitt'),
      email: this.config.get<string>('MAIL_FROM_ADDRESS') ?? '',
    };
  }

  async sendWelcomeOwner(params: {
    to: string;
    firstName: string;
    businessName: string;
    flyerUrl?: string;
  }) {
    await this.send({
      to: params.to,
      templateId: parseInt(this.config.get('BREVO_TEMPLATE_WELCOME_OWNER') ?? ''),
      params: {
        firstName: params.firstName,
        businessName: params.businessName,
        flyerUrl: params.flyerUrl ?? null,
      },
    });
  }

  async sendPasswordReset(params: { to: string; firstName: string; resetUrl: string }) {
    await this.send({
      to: params.to,
      templateId: parseInt(this.config.get('BREVO_TEMPLATE_RESET_PASSWORD') ?? ''),
      params: {
        firstName: params.firstName,
        resetUrl: params.resetUrl,
      },
    });
  }

  private async send(options: {
    to: string;
    templateId?: number;
    params?: Record<string, unknown>;
  }) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: this.from,
        to: [{ email: options.to }],
        templateId: options.templateId,
        params: options.params,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
    }
  }
}

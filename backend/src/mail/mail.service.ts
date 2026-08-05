import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

type PartnerPasswordMailInput = {
  email: string;
  name: string;
  password: string;
  loginUrl: string;
};

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async verifyConfiguration() {
    if (this.isGraphConfigured()) {
      await this.getGraphAccessToken();
      return;
    }

    await this.createTransport().verify();
  }

  async sendPartnerPasswordReset(input: PartnerPasswordMailInput) {
    if (this.isGraphConfigured()) {
      await this.sendGraphMail({
        to: input.email,
        subject: 'Новый пароль для кабинета партнера Centrum Holidays DMC',
        text: this.buildPartnerPasswordText(input),
        html: this.buildPartnerPasswordHtml(input),
      });
      return;
    }

    const transport = this.createTransport();
    const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');

    await transport.verify();
    await transport.sendMail({
      from,
      to: input.email,
      subject: 'Новый пароль для кабинета партнера Centrum Holidays DMC',
      text: this.buildPartnerPasswordText(input),
      html: this.buildPartnerPasswordHtml(input),
    });
  }

  private isGraphConfigured() {
    return Boolean(
      this.configService.get<string>('GRAPH_TENANT_ID') &&
        this.configService.get<string>('GRAPH_CLIENT_ID') &&
        this.configService.get<string>('GRAPH_CLIENT_SECRET') &&
        this.getGraphMailbox(),
    );
  }

  private getGraphMailbox() {
    return (
      this.configService.get<string>('GRAPH_MAILBOX') ||
      this.configService.get<string>('GRAPH_SHARED_MAILBOX') ||
      this.configService.get<string>('SMTP_USER')
    );
  }

  private async getGraphAccessToken() {
    const tenantId = this.configService.get<string>('GRAPH_TENANT_ID');
    const clientId = this.configService.get<string>('GRAPH_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GRAPH_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret || !this.getGraphMailbox()) {
      throw new ServiceUnavailableException('Mail is not configured');
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    const payload = await response.json().catch(() => null) as
      | { access_token?: string; error?: string; error_description?: string }
      | null;

    if (!response.ok || !payload?.access_token) {
      throw new ServiceUnavailableException(
        payload?.error_description || payload?.error || `Microsoft Graph auth failed: HTTP ${response.status}`,
      );
    }

    return payload.access_token;
  }

  private async sendGraphMail(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const mailbox = this.getGraphMailbox();
    if (!mailbox) {
      throw new ServiceUnavailableException('Mail is not configured');
    }

    const accessToken = await this.getGraphAccessToken();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: {
              contentType: 'HTML',
              content: input.html,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: input.to,
                },
              },
            ],
          },
          saveToSentItems: true,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new ServiceUnavailableException(
        `Microsoft Graph sendMail failed: HTTP ${response.status}: ${errorText.slice(0, 500)}`,
      );
    }
  }

  private createTransport() {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM') || user;

    if (!host || !user || !pass || !from) {
      throw new ServiceUnavailableException('Mail is not configured');
    }

    return createTransport({
      host,
      port: Number(this.configService.get<string>('SMTP_PORT') || 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user,
        pass,
      },
    });
  }

  private buildPartnerPasswordText(input: PartnerPasswordMailInput) {
    return [
      `Здравствуйте, ${input.name}!`,
      '',
      'Для вашего кабинета партнера Centrum Holidays DMC был создан новый пароль.',
      `Email: ${input.email}`,
      `Новый пароль: ${input.password}`,
      `Вход в кабинет: ${input.loginUrl}`,
      '',
      'Если вы не запрашивали сброс пароля, пожалуйста, свяжитесь с менеджером Centrum Holidays DMC.',
    ].join('\n');
  }

  private buildPartnerPasswordHtml(input: PartnerPasswordMailInput) {
    return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Новый пароль</title>
  </head>
  <body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6eaf2;">
            <tr>
              <td style="padding:34px 34px 22px;background:#101828;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9db7ff;font-weight:700;">Centrum Holidays DMC</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.16;font-weight:700;">Новый пароль для кабинета партнера</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 34px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Здравствуйте, ${this.escapeHtml(input.name)}!</p>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#344054;">Для вашего партнерского кабинета был создан новый пароль. Используйте данные ниже для входа.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe4ff;border-radius:16px;background:#f8faff;">
                  <tr>
                    <td style="padding:18px 20px;border-bottom:1px solid #e6ecff;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;font-weight:700;">Email</div>
                      <div style="margin-top:6px;font-size:17px;font-weight:700;color:#101828;">${this.escapeHtml(input.email)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;font-weight:700;">Новый пароль</div>
                      <div style="margin-top:8px;display:inline-block;padding:12px 14px;border-radius:12px;background:#ffffff;border:1px solid #d0d9f5;font-size:22px;font-weight:800;letter-spacing:.08em;color:#285aff;">${this.escapeHtml(input.password)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 34px 30px;">
                <a href="${this.escapeHtml(input.loginUrl)}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#285aff;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Открыть кабинет</a>
                <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#667085;">Если вы не запрашивали сброс пароля, пожалуйста, свяжитесь с менеджером Centrum Holidays DMC.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

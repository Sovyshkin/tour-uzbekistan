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
    await this.createTransport().verify();
  }

  async sendPartnerPasswordReset(input: PartnerPasswordMailInput) {
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

  private createTransport() {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM') || user;

    if (!host || !user || !pass || !from) {
      throw new ServiceUnavailableException('SMTP is not configured');
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

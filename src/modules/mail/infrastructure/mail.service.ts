import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOtpResetPassword(
    to: string,
    fullName: string,
    identifier: string,
    otp: string,
    ipAddress?: string,
  ): Promise<void> {
    const otpDigits = otp.split('');

    try {
      await this.mailerService.sendMail({
        to,
        subject: `[RescueSystem] Mã OTP khôi phục mật khẩu của bạn`,
        template: 'otp-reset-password',
        context: {
          fullName,
          identifier,
          otpDigits,
          ipAddress: ipAddress ?? 'Không xác định',
        },
      });

      this.logger.log(`OTP email sent to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
      );
    }
  }
}

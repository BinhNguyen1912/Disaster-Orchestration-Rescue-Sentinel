import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Gửi email chứa mã OTP để khôi phục mật khẩu
   *
   * @param to         - Địa chỉ email người nhận
   * @param fullName   - Tên hiển thị của người nhận (để cá nhân hóa email)
   * @param identifier - Tài khoản (email/SĐT) đã dùng để yêu cầu reset
   * @param otp        - Mã OTP 6 chữ số
   * @param ipAddress  - Địa chỉ IP của thiết bị gửi yêu cầu (bảo mật)
   */
  async sendOtpResetPassword(
    to: string,
    fullName: string,
    identifier: string,
    otp: string,
    ipAddress?: string,
  ): Promise<void> {
    // Tách OTP thành mảng từng chữ số để template render thành ô riêng lẻ
    const otpDigits = otp.split('');

    try {
      await this.mailerService.sendMail({
        to,
        subject: `[RescueSystem] Mã OTP khôi phục mật khẩu của bạn`,
        template: 'otp-reset-password', // Tên file .hbs (không cần đuôi)
        context: {
          fullName,
          identifier,
          otpDigits,
          ipAddress: ipAddress ?? 'Không xác định',
        },
      });

      this.logger.log(`📧 OTP email gửi thành công đến: ${to}`);
    } catch (error) {
      this.logger.error(
        `❌ Gửi email thất bại đến ${to}: ${(error as Error).message}`,
      );
      // Không throw lỗi ra ngoài — tránh lộ thông tin hệ thống mail
      // Lỗi đã được log để tracking
    }
  }
}

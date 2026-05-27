export const APP_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    INVALID_CREDENTIALS: 'Thông tin đăng nhập không hợp lệ',
    UNAUTHORIZED: 'Không có quyền truy cập',
    USER_NOT_FOUND: 'Không tìm thấy người dùng',
    REGISTER_SUCCESS: 'Đăng ký tài khoản thành công',
    EMAIL_OR_PHONE_EXISTS: 'Số điện thoại hoặc Email đã được sử dụng',
    NATIONAL_ID_EXISTS: 'Số CCCD đã được sử dụng',
    REFRESH_SUCCESS: 'Cấp lại token thành công',
    INVALID_REFRESH_TOKEN: 'Refresh token không hợp lệ hoặc đã hết hạn',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
    OTP_SENT: 'Mã OTP khôi phục mật khẩu đã được gửi',
    INVALID_OTP: 'Mã OTP không hợp lệ hoặc đã hết hạn',
    RESET_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',
  },
  VALIDATION: {
    INVALID_STRING: 'Trường này phải là một chuỗi',
    PASSWORD_MIN_LENGTH: 'Mật khẩu phải chứa ít nhất 6 ký tự',
  },
} as const;

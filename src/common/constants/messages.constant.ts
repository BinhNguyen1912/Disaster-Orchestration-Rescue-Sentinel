export const APP_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    INVALID_CREDENTIALS: 'Thông tin đăng nhập không hợp lệ',
    UNAUTHORIZED: 'Không có quyền truy cập',
    USER_NOT_FOUND: 'Không tìm thấy người dùng',
  },
  VALIDATION: {
    INVALID_STRING: 'Trường này phải là một chuỗi',
    PASSWORD_MIN_LENGTH: 'Mật khẩu phải chứa ít nhất 6 ký tự',
  },
} as const;

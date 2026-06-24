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
  USER: {
    USER_NOT_FOUND: 'Không tìm thấy người dùng',
    PHONE_ALREADY_EXISTS: 'Số điện thoại đã được sử dụng',
    EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng',
    NATIONAL_ID_ALREADY_EXISTS: 'Số CCCD đã được sử dụng',
    USER_DELETED: 'Người dùng đã bị xóa',
    PASSWORD_CHANGED: 'Mật khẩu đã được thay đổi',
  },
  VALIDATION: {
    INVALID_STRING: 'Trường này phải là một chuỗi',
    PASSWORD_MIN_LENGTH: 'Mật khẩu phải chứa ít nhất 6 ký tự',
  },
  ROLE: {
    ROLE_NOT_FOUND: 'Không tìm thấy vai trò',
    CANNOT_DELETE_SYSTEM_ROLE: 'Không thể xóa vai trò hệ thống',
  },
  RESCUE: {
    RESCUE_REQUEST_CREATED: 'Yêu cầu cứu hộ đã được tạo thành công',
    RESCUE_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu cứu hộ',
    RESCUE_REQUEST_CANCELLED: 'Yêu cầu cứu hộ đã được hủy',
    RESCUE_REQUEST_COMPLETED: 'Yêu cầu cứu hộ đã được hoàn thành',
    INVALID_SPECIALIZATION_FOR_TEAM_TYPE:
      'Chuyên môn không phù hợp với loại đội cứu hộ',
    RESCUE_TEAM_NOT_FOUND: 'Không tìm thấy đội cứu hộ',
    CANNOT_DELETE_TEAM_WITH_ACTIVE_MEMBERS:
      'Không thể xóa đội cứu hộ khi còn thành viên đang hoạt động',
    USER_ALREADY_IN_TEAM: 'Người dùng đã là thành viên của một đội cứu hộ khác',
    MEMBER_NOT_FOUND: 'Không tìm thấy thành viên trong đội cứu hộ',
    CANNOT_REMOVE_LAST_MEMBER:
      'Không thể xóa thành viên cuối cùng của đội cứu hộ',
    INVALID_PROVINCE: 'Tỉnh/Thành phố không hợp lệ',
    INVALID_ADMIN_UNIT: 'Đơn vị hành chính không hợp lệ',
    ADMIN_UNIT_NOT_IN_PROVINCE:
      'Đơn vị hành chính không thuộc tỉnh/thành phố đã chọn',
  },
  UPLOAD: {
    UPLOAD_ERROR_SELECT_FILE: 'Vui lòng chọn tệp tin cần tải lên.',
    UPLOAD_ERROR_FILE_TYPE: 'Định dạng tệp tin không được hỗ trợ.',
    UPLOAD_ERROR_MAX_SIZE: 'Tệp tin vượt quá kích thước tối đa.',
    UPLOAD_SUCCESS: 'Tải tệp lên thành công',
  },
} as const;

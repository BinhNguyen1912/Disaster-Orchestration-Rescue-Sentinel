# Tài Liệu Đặc Tả API Tích Hợp Module Notification

Tài liệu này tổng hợp toàn bộ danh sách API RESTful trên Backend cần thiết để tích hợp với 6 tab giao diện quản trị thông báo phía Frontend.

---

## Tab 1: Sự Kiện (Event)

### 1.1 Lấy danh sách sự kiện hệ thống
*   **Endpoint**: `GET /notification-events`
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "code": "SOS_CREATED",
          "name": "Có yêu cầu SOS mới",
          "isActive": true,
          "createdAt": "2026-07-11T12:00:00.000Z"
        }
      ]
    }
    ```

### 1.2 Tạo sự kiện hệ thống mới
*   **Endpoint**: `POST /notification-events`
*   **Body**:
    ```json
    {
      "code": "SOS_UPDATED",
      "name": "Thông tin SOS thay đổi",
      "isActive": true
    }
    ```

### 1.3 Cập nhật / Xóa sự kiện
*   **Endpoint**: `PUT /notification-events/:id` hoặc `DELETE /notification-events/:id`

---

## Tab 2: Mẫu Thông Báo (Template)

### 2.1 Lấy danh sách mẫu thông báo
*   **Endpoint**: `GET /notification-templates`
*   **Response**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 101,
          "eventId": 1,
          "groupId": 1,
          "code": "SOS_CREATED_DEFAULT",
          "name": "Mẫu SOS mới mặc định",
          "titleTemplate": "🚨 Có yêu cầu SOS mới từ {{citizenName}}",
          "contentTemplate": "Địa chỉ: {{address}}.",
          "defaultPriority": "CRITICAL",
          "defaultChannels": ["APP", "PUSH", "SMS"],
          "variables": ["citizenName", "address"],
          "provinceId": null,
          "isDefault": true,
          "isActive": true,
          "event": {
            "id": 1,
            "code": "SOS_CREATED",
            "name": "Có yêu cầu SOS mới"
          }
        }
      ]
    }
    ```

### 2.2 Tạo mẫu thông báo mới
*   **Endpoint**: `POST /notification-templates`
*   **Body**:
    ```json
    {
      "name": "Mẫu cập nhật qua SMS",
      "code": "SOS_UPDATED_SMS",
      "eventId": 2,
      "groupId": 1,
      "titleTemplate": "Cứu hộ Việt Nam",
      "contentTemplate": "Yêu cầu cứu trợ số #{{sosId}} đã cập nhật: {{status}}.",
      "defaultPriority": "HIGH",
      "defaultChannels": ["SMS"],
      "variables": ["sosId", "status"],
      "provinceId": null,
      "isDefault": false,
      "isActive": true
    }
    ```

### 2.3 Xem trước kết quả render (Test Render)
*   **Endpoint**: `POST /notification-templates/test-render`
*   **Body**:
    ```json
    {
      "titleTemplate": "Chào {{name}}",
      "contentTemplate": "Bạn ở {{address}} phải không?",
      "data": {
        "name": "Nguyễn Văn A",
        "address": "Quảng Nam"
      }
    }
    ```
*   **Response**:
    ```json
    {
      "success": true,
      "data": {
        "title": "Chào Nguyễn Văn A",
        "content": "Bạn ở Quảng Nam phải không?"
      }
    }
    ```

---

## Tab 3: Thông Báo Đã Gửi

### 3.1 Lấy danh sách các thông báo đã phát đi
*   **Endpoint**: `GET /notifications`
*   **Response**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 201,
          "title": "🚨 Có yêu cầu SOS mới từ Nguyễn Văn A",
          "content": "Địa chỉ: Quận 1, TP. Hồ Chí Minh.",
          "priority": "CRITICAL",
          "status": "PROCESSING",
          "createdAt": "2026-07-11T12:10:00.000Z"
        }
      ]
    }
    ```

---

## Tab 4: Gửi Thông Báo Hàng Loạt

### 4.1 Bắn sự kiện / Phát thông báo hàng loạt (Test Send / Broadcaster)
*   **Endpoint**: `POST /notification-logs/test-send`
*   **Body**:
    ```json
    {
      "event": "SOS_CREATED",
      "data": {
        "citizenName": "Nguyễn Văn A",
        "address": "Quận 1, TP. Hồ Chí Minh",
        "priority": "HIGH"
      },
      "provinceId": null,
      "recipientUserIds": [] // Để trống để tự động quét người nhận theo cấu hình hệ thống
    }
    ```

---

## Tab 5: Lịch Sử Gửi (Logs)

### 5.1 Lấy danh sách logs truyền tải chi tiết
*   **Endpoint**: `GET /notification-logs`
*   **Response**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "uuid-12345",
          "notificationId": 201,
          "recipientId": "uuid-rec-1",
          "channel": "APP",
          "status": "SUCCESS",
          "message": null,
          "sentAt": "2026-07-11T12:10:05.000Z",
          "recipient": {
            "user": {
              "fullName": "Nguyễn Văn A",
              "phone": "0901234567"
            }
          }
        }
      ]
    }
    ```

---

## Tab 6: Kênh Gửi & Cấu Hình

### 6.1 Lấy trạng thái hoạt động các kênh
*   **Endpoint**: `GET /notification-settings/channels`
*   **Response**:
    ```json
    {
      "success": true,
      "data": {
        "app": true,
        "push": true,
        "sms": false,
        "email": true,
        "zalo": false
      }
    }
    ```

### 6.2 Bật/Tắt kênh truyền tải
*   **Endpoint**: `POST /notification-settings/channels/toggle`
*   **Body**:
    ```json
    {
      "channel": "sms",
      "enabled": true
    }
    ```

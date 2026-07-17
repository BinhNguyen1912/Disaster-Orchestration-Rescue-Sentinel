# HƯỚNG DẪN THỰC HÀNH DEPLOY: DOCKER + NGINX + BACKEND + FRONTEND
## (Từ A - Z dành cho dự án của bạn)

Tài liệu này ghi chú chi tiết từng bước cấu hình, giải thích từng dòng lệnh và sơ đồ luồng hoạt động để bạn tự thực hành.

---

# PHẦN 1: SƠ ĐỒ LUỒNG HOẠT ĐỘNG (WORKFLOW)

Khi người dùng truy cập trang web, luồng dữ liệu sẽ đi qua các thành phần như sau:

```
                  ┌──────────────────────────────────────────────┐
                  │                User's Browser                │
                  └───────────────┬──────────────┬───────────────┘
                                  │              │
                     HTTP (Port 80)              │ HTTPS (Port 443)
                                  │              │
                                  ▼              ▼
     ┌───────────────────────────────────────────────────────────┐
     │                      Container: Nginx                     │
     │                      (Port 80 -> 443)                     │
     └───────┬───────────────────────────────┬───────────────────┘
             │                               │
             │ Nếu request là API            │ Nếu request là Static Asset (SPA)
             │ (VD: /api/users)              │ (VD: /index.html, /static/main.js)
             ▼                               ▼
┌────────────────────────────┐    ┌──────────────────────────────┐
│   Container: rescue-api    │    │ Phục vụ trực tiếp từ thư mục │
│        (Port 4000)         │    │       ./fe/dist mount        │
└────────────┬───────────────┘    └──────────────────────────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
PostgreSQL         Redis
(rescue-db)    (rescue-redis)
```

### Giải thích vai trò của từng thành phần:
1.  **Browser (Trình duyệt):** Gửi request qua cổng `80` (HTTP) hoặc `443` (HTTPS).
2.  **Nginx Container (`rescue-nginx`):** 
    *   Lắng nghe cổng `80`, tự động redirect mọi request sang cổng `443` (HTTPS).
    *   Lắng nghe cổng `443`, giải mã SSL bằng file chứng chỉ `cert.pem` và `key.pem`.
    *   Nếu đường dẫn là `/api/`, Nginx chuyển tiếp (proxy_pass) sang cụm Backend `rescue-api`.
    *   Nếu đường dẫn là `/` hoặc `/static/`, Nginx đọc trực tiếp các file tĩnh của Frontend được chia sẻ từ thư mục `./fe/dist` và trả về ngay cho Browser mà không làm phiền Backend.
3.  **Backend Container (`rescue-api`):** Chạy ứng dụng NestJS/NodeJS trên cổng `4000`. Chỉ giao tiếp nội bộ trong mạng ảo Docker với Database, Redis và Nginx.
4.  **Database (`rescue-db`) & Redis (`rescue-redis`):** Lưu trữ dữ liệu và xử lý hàng đợi (BullMQ) / cache.

---

# PHẦN 2: CẤU TRÚC THƯ MỤC SAU KHI THIẾT LẬP
Để chuẩn bị cho deploy, ta đưa file `docker-compose.yml` lên thư mục gốc của dự án `DOAN/` và gom các file cấu hình Nginx vào một thư mục riêng:

```text
DOAN/
├── be/                          # Thư mục Backend hiện tại
│   ├── Dockerfile               # File build Docker cho Backend NestJS
│   └── ...
├── fe/                          # Thư mục Frontend hiện tại (chưa có Docker compose)
│   ├── dist/                    # Sẽ xuất hiện sau khi bạn chạy npm run build
│   └── ...
├── nginx/                       # Thư mục cấu hình Nginx (Tự tạo mới)
│   ├── nginx.conf               # File cấu hình Nginx (Tự tạo mới)
│   └── ssl/                     # Thư mục chứa chứng chỉ bảo mật (Tự tạo mới)
│       ├── cert.pem             # File chứng chỉ SSL tự ký để test
│       └── key.pem              # File private key SSL tự ký để test
└── docker-compose.yml           # File Docker Compose chung (Di chuyển lên root)
```

---

# PHẦN 3: CHI TIẾT FILE DOCKER-COMPOSE.YML (TẠI THƯ MỤC GỐC DOAN/)

Bạn hãy tạo file `docker-compose.yml` tại thư mục gốc `d:\DoAn\DOAN\docker-compose.yml` với nội dung dưới đây:

```yaml
version: '3.8'

services:
  # =========================================================================
  # 1. DATABASE CONTAINER
  # =========================================================================
  postgres:
    image: postgis/postgis:15-3.4
    container_name: rescue-db
    restart: unless-stopped
    ports:
      - "5433:5432"  # Ánh xạ cổng: Ở ngoài máy host dùng cổng 5433 để kết nối vào cổng 5432 của Container
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 123123
      POSTGRES_DB: rescue_system
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Giữ lại dữ liệu của DB trên máy thật, không bị mất khi container bị xóa
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d rescue_system"] # Câu lệnh kiểm tra database đã sẵn sàng nhận kết nối hay chưa
      interval: 10s   # Cứ mỗi 10 giây sẽ kiểm tra 1 lần
      timeout: 5s     # Chờ tối đa 5 giây cho mỗi lần check
      retries: 5      # Nếu lỗi liên tiếp 5 lần thì đánh dấu container bị "unhealthy"

  # =========================================================================
  # 2. REDIS CONTAINER
  # =========================================================================
  redis:
    image: redis:7-alpine
    container_name: rescue-redis
    restart: unless-stopped
    ports:
      - "6379:6379"  # Ánh xạ cổng Redis ra máy thật
    volumes:
      - redis_data:/data  # Giữ lại dữ liệu Redis
    healthcheck:
      test: ["CMD", "redis-cli", "ping"] # Gửi lệnh ping tới Redis. Nếu trả về PONG là khỏe mạnh
      interval: 10s
      timeout: 5s
      retries: 5

  # =========================================================================
  # 3. BACKEND (NESTJS) CONTAINER
  # =========================================================================
  backend:
    build:
      context: ./be         # Tìm Dockerfile ở thư mục be để tự build image
      dockerfile: Dockerfile
    container_name: rescue-api
    restart: unless-stopped
    ports:
      - "4000:4000"         # Ánh xạ cổng API ra ngoài (để test trực tiếp nếu muốn)
    environment:
      NODE_ENV: production
      # Sử dụng tên dịch vụ "postgres" và "redis" thay cho localhost vì các container kết nối nội bộ
      DATABASE_URL: postgresql://postgres:123123@postgres:5432/rescue_system
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy  # Chỉ khởi động backend sau khi postgres đã pass qua bài test healthcheck ở trên
      redis:
        condition: service_healthy   # Chỉ khởi động backend sau khi redis đã sẵn sàng kết nối

  # =========================================================================
  # 4. NGINX (REVERSE PROXY) CONTAINER
  # =========================================================================
  nginx:
    image: nginx:alpine
    container_name: rescue-nginx
    restart: unless-stopped
    ports:
      - "80:80"    # Lắng nghe HTTP ở ngoài máy thật
      - "443:443"  # Lắng nghe HTTPS ở ngoài máy thật
    volumes:
      # readonly (:ro) để đảm bảo container Nginx không chỉnh sửa được file cấu hình gốc của bạn
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      # Chia sẻ thư mục code Frontend đã build để Nginx serve trực tiếp
      - ./fe/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend    # Chỉ khởi động Nginx khi backend đã khởi chạy

volumes:
  postgres_data:   # Khai báo volume lưu trữ Postgres
  redis_data:      # Khai báo volume lưu trữ Redis
```

---

# PHẦN 4: CHI TIẾT FILE NGINX.CONF (LƯU TẠI DOAN/nginx/nginx.conf)

Bạn hãy tạo file `nginx.conf` tại thư mục `d:\DoAn\DOAN\nginx\nginx.conf` với nội dung dưới đây:

```nginx
# Cấu hình user chạy worker
user nginx;

# Tự động điều chỉnh số tiến trình worker dựa trên số nhân CPU
worker_processes auto;

# Lưu vết logs lỗi từ mức cảnh báo 'warn' trở lên
error_log /var/log/nginx/error.log warn;

# File lưu mã ID tiến trình chính của Nginx
pid /var/run/nginx.pid;

events {
    # Số kết nối đồng thời tối đa của mỗi tiến trình worker
    worker_connections 2048;
    
    # Cho phép worker nhận hết các kết nối đang chờ trong hàng đợi thay vì nhận từng kết nối một
    multi_accept on;
    
    # Sử dụng cơ chế epoll tối ưu hóa I/O trên Linux
    use epoll;
}

http {
    # Ánh xạ đuôi file sang HTTP Content-Type tương ứng
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Tắt thông báo phiên bản Nginx ở header của response
    server_tokens off;

    # Định nghĩa cấu trúc log, thêm rt=$request_time để đo thời gian xử lý của Nginx
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                     '$status $body_bytes_sent "$http_referer" '
                     '"$http_user_agent" rt=$request_time';
    access_log /var/log/nginx/access.log main;

    # Tối ưu hóa gửi file tĩnh tốc độ cao
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    
    # Giới hạn kích thước file upload tối đa là 20MB
    client_max_body_size 20m;

    # Bật nén gzip để giảm dung lượng file gửi về trình duyệt
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 256;

    # Định nghĩa vùng lưu trữ giới hạn (Rate limit)
    # Zone api_limit: lưu trữ tối đa ~160.000 IP khách hàng, giới hạn 10 request/giây cho 1 IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    # Zone conn_limit: giới hạn số lượng kết nối TCP đồng thời từ 1 IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # =========================================================================
    # UPSTREAM (NHÓM SERVER BACKEND)
    # Trong Docker, ta trỏ thẳng đến tên service của backend là "backend:4000"
    # =========================================================================
    upstream api_backend {
        server backend:4000;
        keepalive 32; # Giữ sẵn tối đa 32 kết nối TCP để tái sử dụng
    }

    # =========================================================================
    # SERVER 1: LẮNG NGHE HTTP (CỔNG 80) -> REDIRECT TOÀN BỘ SANG HTTPS
    # =========================================================================
    server {
        listen 80;
        server_name localhost;
        return 301 https://$host$request_uri; # Redirect vĩnh viễn (301) sang HTTPS
    }

    # =========================================================================
    # SERVER 2: LẮNG NGHE HTTPS (CỔNG 443)
    # =========================================================================
    server {
        listen 443 ssl http2;
        server_name localhost;

        # Cấu hình file chứng chỉ SSL (mount từ máy thật qua volume)
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;

        # Thư mục chứa code Frontend tĩnh
        root /usr/share/nginx/html;
        index index.html;

        # Headers bảo mật cơ bản chống Clickjacking và XSS
        add_header X-Frame-Options SAMEORIGIN always;
        add_header X-Content-Type-Options nosniff always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # --- PHÂN LUỒNG LOCATION ---

        # 1. Frontend SPA (Single Page Application - React Router/Vue Router)
        location / {
            # Thử tìm file tương ứng với URL, nếu không có thì trả về index.html để JS tự điều hướng
            try_files $uri $uri/ /index.html;
        }

        # 2. File tĩnh (JS/CSS build của frontend, ảnh...)
        location /static/ {
            alias /usr/share/nginx/html/static/;
            expires 30d; # Cache 30 ngày ở trình duyệt
            add_header Cache-Control "public, immutable"; # Báo trình duyệt file này không bao giờ thay đổi
            access_log off; # Tắt log cho file tĩnh để tiết kiệm dung lượng đĩa
        }

        # 3. Chuyển tiếp request API đến Backend NestJS
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay; # Áp dụng giới hạn rate limit
            limit_conn conn_limit 20;                  # Giới hạn 20 kết nối đồng thời từ 1 IP

            # Chú ý dấu '/' ở cuối: cắt bỏ tiền tố "/api" khi chuyển sang backend
            # Ví dụ: /api/auth/login -> http://backend:4000/auth/login
            proxy_pass http://api_backend/;
            proxy_http_version 1.1;

            # Header đính kèm để Backend biết thông tin thật của người dùng
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Thời gian timeout kết nối sang backend
            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # 4. Proxy dành riêng cho WebSocket (Chat, Realtime...)
        location /ws/ {
            proxy_pass http://api_backend/;
            proxy_http_version 1.1;
            # 2 dòng bắt buộc để kích hoạt chuyển đổi giao thức sang WebSocket
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600s; # Giữ kết nối tối đa 1 tiếng mà không bị ngắt
        }

        # 5. Endpoint Healthcheck nội bộ
        location = /health {
            access_log off;
            return 200 "ok\n";
            add_header Content-Type text/plain;
        }

        # 6. Chặn truy cập các file ẩn nhạy cảm (như .env, .git...)
        location ~ /\.(?!well-known) {
            deny all;
        }
    }
}
```

---

# PHẦN 5: CÁC BƯỚC THỰC HÀNH TỪ ĐẦU ĐẾN CUỐI (TỪNG LỆNH CỤ THỂ)

Do Frontend hiện chưa có mã nguồn build sẵn trong thư mục `fe/dist`, bạn cần chuẩn bị dự án và chạy theo thứ tự sau:

### Bước 5.1: Build code Frontend thành file tĩnh
Nginx chỉ có thể phục vụ file tĩnh nếu frontend đã được compile (build). Bạn vào thư mục Frontend trên máy host và chạy lệnh:
1.  **Di chuyển vào thư mục frontend:**
    ```bash
    cd d:\DoAn\DOAN\fe
    ```
2.  **Cài đặt các thư viện (nếu chưa cài):**
    ```bash
    npm install
    ```
3.  **Build dự án ra file tĩnh:**
    ```bash
    npm run build
    ```
    *(Sau lệnh này, bạn sẽ thấy thư mục `fe/dist` được tạo ra, bên trong có file `index.html` và thư mục `assets` hoặc `static`).*

---

### Bước 5.2: Tạo thư mục chứa Nginx và SSL tự ký
Bạn quay lại thư mục gốc và tạo các thư mục cần thiết cùng file chứng chỉ SSL tự ký để test HTTPS trên máy local:
1.  **Di chuyển về thư mục gốc:**
    ```bash
    cd d:\DoAn\DOAN
    ```
2.  **Tạo thư mục cấu hình Nginx và SSL:**
    ```bash
    mkdir -p nginx/ssl
    ```
3.  **Tạo chứng chỉ SSL tự ký (self-signed):**
    Chạy lệnh OpenSSL sau đây để sinh ra file `cert.pem` và `key.pem` trong thư mục `nginx/ssl/`:
    ```bash
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -subj "/C=VN/ST=HCM/L=HCM/O=RescueSystem/CN=localhost"
    ```
    *Giải thích lệnh OpenSSL:*
    *   `req -x509`: Chỉ định xuất ra chứng chỉ tự ký theo chuẩn X.509.
    *   `-nodes`: Không mã hóa private key (để Nginx có thể khởi động tự động mà không cần bạn nhập mật khẩu giải mã key).
    *   `-days 365`: Chứng chỉ này có giá trị sử dụng trong vòng 365 ngày.
    *   `-newkey rsa:2048`: Tạo một cặp khóa mới RSA có độ dài khóa là 2048 bit.
    *   `-keyout .../key.pem`: Tên và nơi lưu file Private Key.
    *   `-out .../cert.pem`: Tên và nơi lưu file Certificate công khai.
    *   `-subj "/C=VN/ST=HCM..."`: Điền sẵn thông tin chứng chỉ (Country=VN, State=HCM, Organization=RescueSystem, Common Name=localhost) để bỏ qua bước nhập hỏi tay trên terminal.

---

### Bước 5.3: Chạy ứng dụng bằng Docker Compose
Sau khi đã chuẩn bị xong file `docker-compose.yml`, thư mục `nginx/` chứa file cấu hình và ssl, thư mục `fe/dist` đã được build thành công, bạn bắt đầu khởi động dự án:

1.  **Build và khởi chạy tất cả các container:**
    ```bash
    docker compose up -d --build
    ```
    *Giải thích:*
    *   `up`: Khởi động các container.
    *   `-d` (detached mode): Chạy các container dưới nền, trả lại màn hình terminal để bạn gõ lệnh tiếp.
    *   `--build`: Ép Docker rebuild lại image của NestJS Backend nếu có bất kỳ thay đổi nào trong mã nguồn backend.

2.  **Kiểm tra xem các container đã chạy ổn định chưa:**
    ```bash
    docker compose ps
    ```
    *Bạn sẽ thấy danh sách các container `rescue-db`, `rescue-redis`, `rescue-api`, và `rescue-nginx` ở trạng thái "Up".*

3.  **Xem log của container Nginx để đảm bảo không bị lỗi cấu hình:**
    ```bash
    docker compose logs -f nginx
    ```
    *Nhấn `Ctrl + C` để thoát khỏi màn hình xem log.*

---

### Bước 5.4: Kiểm tra kết quả hoạt động
Sử dụng công cụ `curl` (hoặc mở trình duyệt truy cập địa chỉ `https://localhost`) để kiểm tra:

1.  **Kiểm tra HTTP redirect sang HTTPS:**
    ```bash
    curl -I http://localhost/
    ```
    *Kết quả trả về phải chứa dòng `HTTP/1.1 301 Moved Permanently` và `Location: https://localhost/`.*

2.  **Kiểm tra endpoint Healthcheck:**
    ```bash
    curl http://localhost/health
    ```
    *Kết quả trả về phải là chữ `ok`.*

3.  **Kiểm tra API thông qua Reverse Proxy (Nginx):**
    ```bash
    curl -k https://localhost/api/
    ```
    *Tham số `-k` (insecure) bắt buộc phải có vì chúng ta đang dùng chứng chỉ tự ký (self-signed cert), trình duyệt và curl mặc định sẽ cảnh báo đỏ không an toàn.*

---

# PHẦN 6: CÁC LỆNH DEBUG TIỆN DỤNG HÀNG NGÀY TRONG DOCKER

Khi bạn thay đổi nội dung file cấu hình `nginx.conf`, bạn không cần phải tắt và bật lại toàn bộ Docker. Hãy sử dụng các lệnh sau:

1.  **Kiểm tra cú pháp file cấu hình bên trong Container Nginx:**
    ```bash
    docker compose exec nginx nginx -t
    ```
    *Lệnh này chạy chương trình `nginx -t` bên trong container `nginx`. Trả về `syntax is ok` thì bạn hoàn toàn yên tâm.*

2.  **Tải lại cấu hình Nginx mà không gây downtime (reload):**
    ```bash
    docker compose exec nginx nginx -s reload
    ```

3.  **Đi vào bên trong container Nginx để kiểm tra hệ thống file:**
    ```bash
    docker compose exec nginx sh
    ```
    *(Gõ `exit` để quay ra máy thật).*

4.  **Xem log của toàn bộ hệ thống (cả DB, Redis, API, Nginx) realtime:**
    ```bash
    docker compose logs -f
    ```

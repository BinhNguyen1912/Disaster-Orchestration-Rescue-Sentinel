# NGINX MASTER GUIDE — Từ Config Thật Đến Hiểu Bản Chất

## Dành cho Backend Dev muốn lên trình DevOps

> Tài liệu này **bổ sung** cho file `DOCKER & NGINX COMPLETE REFERENCE` bạn đã có — file kia là "từ điển" (liệt kê directive), còn file này là **một config thật, chạy được, chú thích từng dòng theo giai đoạn (production / staging / static / api / websocket)**, kèm lý do tại sao viết như vậy và cách tối ưu.

Cách đọc: đọc từ trên xuống, mỗi block đều có 4 phần:

1. **Định nghĩa** — nó là gì
2. **Code thật** — copy chạy được
3. **Vì sao viết thế này** — tư duy thực chiến
4. **Bẫy thường gặp** — lỗi devop mới hay dính

---

# PHẦN 0 — SƠ ĐỒ TỔNG QUAN 1 HỆ THỐNG THỰC TẾ

Giả sử bạn có hệ backend điển hình:

```
Internet
   │
   ▼
Nginx (reverse proxy + static + SSL)
   │
   ├── /              → frontend build (React/Vue static files)
   ├── /api/           → upstream api_backend (Node.js, port 4000, 3 containers)
   ├── /staging/        → upstream staging_backend (môi trường test riêng)
   ├── /ws/            → upstream api_backend (WebSocket - realtime)
   ├── /static/         → file tĩnh, cache dài hạn (ảnh, css, js build)
   └── /health          → healthcheck nội bộ, không log, chặn public
```

Đây chính là bố cục file `nginx.conf` / `default.conf` mà 90% dự án Node.js/Python/Java sau lưng Docker sẽ dùng. Ta sẽ build nguyên file này.

---

# PHẦN 1 — FILE CONFIG ĐẦY ĐỦ (COPY CHẠY ĐƯỢC)

## MAIN CONTEXT — cấu hình toàn cục, nằm ngoài mọi block

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;
```

### `user nginx;`

Chỉ định **User** (`nginx` chỉ là tên user tồn tại trên Linux) mà các **Worker Process** sẽ chạy dưới quyền.

### `worker_processes auto;`

Để Nginx tự detect số CPU core và tạo số Worker Process tương ứng.
Ví dụ: máy có 4 core → Nginx tạo 4 Worker.

### `error_log`

Đây là nơi ghi các lỗi xảy ra trong quá trình Nginx chạy.

```nginx
error_log <đường_dẫn_file> <mức_log>;
```

**Các mức log**, từ nhẹ đến nghiêm trọng nhất:

| Mức      | Ý nghĩa                        |
| -------- | ------------------------------ |
| `debug`  | Chi tiết nhất, dùng khi debug  |
| `info`   | Thông tin chung                |
| `notice` | Đáng chú ý nhưng chưa phải lỗi |
| `warn`   | Cảnh báo                       |
| `error`  | Lỗi                            |
| `crit`   | Nghiêm trọng                   |
| `alert`  | Cần xử lý ngay                 |
| `emerg`  | Hệ thống có thể sập            |

### `pid`

**PID (Process ID)** là mã định danh của **Master Process**. Nginx lưu PID này vào file `/var/run/nginx.pid` để khi thực hiện các lệnh như `nginx -s reload`, `nginx -s stop` hoặc `nginx -s quit`, hệ thống biết chính xác cần gửi tín hiệu đến tiến trình nào.

Ví dụ, khi chạy `nginx -s reload`, Nginx sẽ đọc PID trong file `/var/run/nginx.pid`, sau đó gửi tín hiệu `SIGHUP` đến **Master Process** để tiến trình này đọc lại file cấu hình, tạo **Worker Process** mới và cho các Worker cũ thoát một cách an toàn.

Nếu không có file `/var/run/nginx.pid`, Nginx sẽ không xác định được **Master Process** cần điều khiển.

---

## Block `events {}`

Block `events {}` là nơi cấu hình cách các Worker Process xử lý các kết nối TCP (Connection). Đây là một trong những phần quan trọng nhất quyết định hiệu năng của Nginx.

> **Block `events` xử lý Connection (TCP Socket), không phải HTTP Request.**

Luồng hoạt động:

```
Client → TCP Connection → events → Worker Process → HTTP Request
```

Nói đơn giản:

- `events` quản lý **kết nối**.
- `http` xử lý **nội dung request/response**.

```nginx
events {
    worker_connections 2048;
    multi_accept on;
    use epoll;
}
```

### `worker_connections 2048;`

Quy định mỗi Worker Process được phép mở tối đa bao nhiêu kết nối đồng thời.

Đây chỉ là giới hạn của Nginx, còn thực tế còn phụ thuộc vào:

- `ulimit -n` (giới hạn file descriptor của Linux).
- RAM của máy.
- Mỗi kết nối đến backend cũng tiêu tốn thêm file descriptor.

### `multi_accept`

**Chức năng:** quy định mỗi lần Worker được đánh thức, nó sẽ nhận **một** hay **nhiều** kết nối mới cùng lúc.

**Khi `off`:**

```nginx
multi_accept off;
```

Giả sử có **100 Client** đến cùng lúc. Worker sẽ xử lý tuần tự:

1. Wake up
2. Accept 1 connection
3. Sleep
4. Wake up
5. Accept 1 connection
6. Sleep
7. ... (lặp lại cho từng kết nối)

→ Mỗi lần chỉ nhận **1 kết nối**.

**Khi `on`:**

```nginx
multi_accept on;
```

Worker sẽ:

1. Wake up
2. Accept **toàn bộ** connection đang chờ trong hàng đợi

Ví dụ: Kernel Queue có 50 Connection đang chờ → Worker nhận cả **50 Connection** trong một lần thức dậy.

**Lợi ích:**

- Giảm số lần đánh thức Worker.
- Tăng throughput khi có nhiều kết nối đến cùng lúc.
- Phù hợp với website có lưu lượng truy cập lớn.

### `use epoll;`

Chỉ định cơ chế xử lý I/O ở tầng hệ điều hành. `epoll` là cơ chế hiệu năng cao nhất trên Linux (so với `select`/`poll` đời cũ).

---

## Block `http {}`

Block `http {}` là nơi xử lý toàn bộ logic liên quan đến **HTTP Request/Response** — ngược lại với `events {}` chỉ lo phần kết nối TCP thô. Mọi thứ liên quan đến log, nén, giới hạn upload, rate limit, và định nghĩa các nhóm backend (upstream) đều nằm trong này.

### Chuẩn hoá & bảo mật cơ bản

```nginx
include /etc/nginx/mime.types;
default_type application/octet-stream;
server_tokens off;
```

- **`include /etc/nginx/mime.types;`** — nạp bảng ánh xạ đuôi file → Content-Type (VD: `.js` → `application/javascript`, `.png` → `image/png`). Không có dòng này, trình duyệt có thể không hiểu nên xử lý file trả về như thế nào.
- **`default_type application/octet-stream;`** — nếu file có đuôi không nằm trong `mime.types`, Nginx trả về kiểu này (buộc trình duyệt tải file xuống thay vì cố hiển thị).
- **`server_tokens off;`** — tắt việc lộ version Nginx trong header `Server` (mặc định là `Server: nginx/1.25.3`). Ẩn version giúp giảm bề mặt tấn công, vì hacker sẽ khó biết chính xác lỗ hổng nào đang áp dụng được cho bản Nginx bạn đang chạy.

### Log format có `$request_time`

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                 '$status $body_bytes_sent "$http_referer" '
                 '"$http_user_agent" rt=$request_time';
access_log /var/log/nginx/access.log main;
```

- **`log_format main ...`** — định nghĩa một mẫu log tên là `main`, gồm các biến: IP client, user (nếu có auth), thời gian, request, status code, số byte trả về, referer, user-agent.
- **Điểm quan trọng nhất:** `rt=$request_time` — đây là thời gian Nginx xử lý toàn bộ request (tính bằng giây, có phần thập phân). Thêm biến này vào log giúp bạn **đo hiệu năng thực tế** của từng request mà không cần công cụ APM riêng — chỉ cần `grep`/`awk` file log là biết request nào chậm.
- **`access_log ... main;`** — áp dụng format `main` vừa định nghĩa cho file log truy cập.

### Performance cơ bản

```nginx
sendfile on;
tcp_nopush on;
tcp_nodelay on;
keepalive_timeout 65;
client_max_body_size 20m;
```

- **`sendfile on;`** — cho phép Nginx dùng syscall `sendfile()` để gửi file trực tiếp từ disk ra network socket, bỏ qua bước copy dữ liệu qua user-space. Nhanh hơn đáng kể khi phục vụ static file (ảnh, JS, CSS).
- **`tcp_nopush on;`** — chỉ có tác dụng khi `sendfile on`. Nó gom các gói tin HTTP header + phần đầu file thành 1 packet trước khi gửi đi, thay vì gửi header riêng rồi mới gửi data (giảm số lượng packet TCP).
- **`tcp_nodelay on;`** — tắt thuật toán Nagle (vốn được dùng để gom nhiều gói nhỏ lại), giúp dữ liệu nhỏ được gửi đi ngay lập tức thay vì chờ. Rất quan trọng cho các kết nối giữ lâu (keep-alive) hoặc realtime, nơi độ trễ (latency) quan trọng hơn việc tối ưu số lượng packet.
- **`keepalive_timeout 65;`** — thời gian (giây) Nginx giữ 1 kết nối TCP mở sau khi trả response, để client có thể gửi request tiếp theo mà không cần bắt tay TCP lại từ đầu. 65s là mức cân bằng phổ biến — quá ngắn thì mất lợi ích keep-alive, quá dài thì tốn tài nguyên giữ connection rảnh.
- **`client_max_body_size 20m;`** — giới hạn kích thước tối đa của request body (thường là file upload) là 20MB. Nếu không set, mặc định Nginx chỉ cho 1MB — rất dễ gây lỗi `413 Request Entity Too Large` khi user upload ảnh/file. Đồng thời đây cũng là một lớp chống DoS: chặn client gửi file khổng lồ làm nghẽn băng thông/disk server.

### Nén response (gzip)

```nginx
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript
           text/xml application/xml application/xml+rss text/javascript
           image/svg+xml;
gzip_min_length 256;
```

- **`gzip on;`** — bật nén response trước khi gửi về client, giảm dung lượng truyền tải → tải trang nhanh hơn, tiết kiệm băng thông.
- **`gzip_vary on;`** — thêm header `Vary: Accept-Encoding`, báo cho các lớp cache (CDN, browser cache) biết rằng response có thể khác nhau tùy theo việc client có hỗ trợ gzip hay không, tránh cache nhầm bản nén cho client không hỗ trợ.
- **`gzip_comp_level 6;`** — mức độ nén, từ 1 (nhanh, nén ít) đến 9 (chậm, nén nhiều). Mức 6 là điểm cân bằng phổ biến giữa CPU tiêu tốn và dung lượng tiết kiệm được.
- **`gzip_types ...`** — chỉ định các loại `Content-Type` sẽ được nén. Chỉ nén nội dung dạng text (CSS, JS, JSON, XML, SVG...) vì các định dạng nhị phân như ảnh JPG/PNG, video đã tự nén sẵn — gzip thêm lần nữa chỉ tốn CPU vô ích mà không giảm dung lượng đáng kể.
- **`gzip_min_length 256;`** — chỉ nén nếu response lớn hơn 256 byte. File quá nhỏ thì nén xong có khi còn to hơn bản gốc (do overhead của gzip header), nên bỏ qua để tránh tốn CPU vô ích.

### Rate limiting zone

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
```

Hai dòng này chỉ **định nghĩa** vùng nhớ dùng để giới hạn tốc độ — chưa áp dụng ngay, phải gọi `limit_req` / `limit_conn` bên trong `location` mới có hiệu lực (sẽ nói ở phần sau).

- **`limit_req_zone`** — định nghĩa một zone tên `api_limit`, dung lượng bộ nhớ 10MB, giới hạn tốc độ **10 request/giây** cho mỗi IP (`$binary_remote_addr`). Zone này dùng để chống spam request (VD: brute-force login, bot cào dữ liệu).
- **`limit_conn_zone`** — định nghĩa zone tên `conn_limit`, cũng 10MB, dùng để giới hạn **số lượng connection đồng thời** từ mỗi IP (khác với giới hạn số request/giây ở trên).
- Lưu ý: 10MB bộ nhớ đủ lưu trạng thái cho khoảng ~160,000 IP (mỗi IP tốn ~64 byte), nên với hầu hết dự án vừa và nhỏ, 10MB là dư dùng.

### Upstream: nhóm backend cho PRODUCTION API

```nginx
upstream api_backend {
    least_conn;
    server api1:4000 max_fails=3 fail_timeout=30s;
    server api2:4000 max_fails=3 fail_timeout=30s;
    server api3:4000 max_fails=3 fail_timeout=30s backup;
    keepalive 32;
}
```

## Proxy là gì?

**Proxy** là một "trung gian" đứng giữa client (người dùng) và server thật, thay mặt một bên để giao tiếp với bên còn lại — nhận request, chuyển tiếp, nhận response, rồi trả lại.

### Forward Proxy (proxy thuận)

Đứng về phía **client**, che giấu client khỏi server.

```
Client → Forward Proxy → Internet → Server
```

Server chỉ thấy request đến từ proxy, không biết client thật là ai. Dùng để: ẩn IP, vượt tường lửa/chặn địa lý, công ty kiểm soát truy cập web của nhân viên.

### Reverse Proxy (proxy nghịch) — vai trò của Nginx

Đứng về phía **server**, che giấu server khỏi client.

```
Client → Internet → Reverse Proxy (Nginx) → Server thật (backend)
```

Client chỉ biết đang nói chuyện với Nginx, không biết phía sau có bao nhiêu server, chạy công nghệ gì.

**Lợi ích chính:**

- Giấu kiến trúc backend (bảo mật).
- Load balancing — phân phối request đến nhiều server.
- Một điểm vào duy nhất (443) route đến nhiều service theo path (`/api/`, `/staging/`, `/ws/`...).
- Xử lý SSL, gzip, cache, rate limit tập trung, backend không cần lo.

---

## `proxy_pass` là gì?

`proxy_pass` là directive bảo Nginx: **forward request này sang một server/backend khác**, rồi lấy response từ đó trả về client. Đây là cơ chế cốt lõi biến Nginx thành reverse proxy.

### Cú pháp cơ bản

```nginx
location /api/ {
    proxy_pass http://api_backend/;
}
```

`api_backend` có thể là tên `upstream` hoặc trỏ thẳng địa chỉ cụ thể:

```nginx
proxy_pass http://127.0.0.1:4000;
```

### Điểm quan trọng nhất: dấu `/` ở cuối

| `location` | `proxy_pass`                     | Client gửi   | Backend nhận              |
| ---------- | -------------------------------- | ------------ | ------------------------- |
| `/api/`    | `http://api_backend/` (có `/`)   | `/api/users` | `/users` (cắt `/api`)     |
| `/api/`    | `http://api_backend` (không `/`) | `/api/users` | `/api/users` (giữ nguyên) |

Có path (kể cả chỉ `/`) sau host → Nginx cắt phần `location` khớp và thay bằng path đó. Không có path → giữ nguyên URI gốc. Đây là lỗi rất hay gặp: thiếu dấu `/` khiến backend nhận sai path và trả `404`.

### Thường đi kèm header forward

```nginx
location /api/ {
    proxy_pass http://api_backend/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Vì backend nhận request từ Nginx chứ không phải trực tiếp từ client, thiếu các header này backend sẽ thấy mọi request đến từ IP của Nginx thay vì IP thật của người dùng. <br>
`upstream` định nghĩa một **nhóm server backend**, để `location` phía dưới có thể `proxy_pass` request đến nhóm này thay vì 1 server cố định — đây chính là cơ chế **load balancing** của Nginx.

- **`least_conn;`** — thuật toán chọn server: gửi request mới đến server đang có **ít connection đang xử lý nhất**. Phù hợp khi các request có thời gian xử lý không đều nhau (khác với `round-robin` mặc định là chia đều tuần tự bất kể server đang bận hay rảnh).
- **`server api1:4000 max_fails=3 fail_timeout=30s;`** — một backend, chạy ở host `api1` cổng `4000` (thường là tên container trong Docker network). `max_fails=3` nghĩa là nếu server này fail 3 lần liên tiếp, Nginx sẽ đánh dấu nó "die" và ngừng gửi request đến trong `fail_timeout=30s` (30 giây), sau đó thử lại.
- **`server api3:4000 ... backup;`** — từ khóa `backup` nghĩa là server này **chỉ được dùng khi tất cả server không có `backup` đều die**. Đây là cơ chế dự phòng (failover), không tham gia load balancing bình thường.
- **`keepalive 32;`** — giữ sẵn tối đa 32 kết nối TCP đã mở tới các backend trong nhóm này, để tái sử dụng cho các request tiếp theo thay vì mở/đóng kết nối mới liên tục — giảm độ trễ và tải cho backend (bắt tay TCP tốn thời gian).

### Upstream: nhóm backend riêng cho STAGING

```nginx
upstream staging_backend {
    server staging-api:4000;
}
```

Môi trường staging (test) thường chỉ chạy **1 instance duy nhất**, không cần load balance hay backup — tách riêng khỏi `api_backend` để tránh traffic test vô tình lẫn vào production, và để có thể thay đổi cấu hình staging (VD: bật thêm log debug) mà không ảnh hưởng production.

### Server: redirect toàn bộ HTTP → HTTPS

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

Đây là một `server` block riêng, chỉ lắng nghe cổng **80 (HTTP)**.

- **`listen 80;`** — chỉ xử lý request đến qua HTTP thường (chưa mã hoá).
- **`server_name example.com www.example.com;`** — block này chỉ áp dụng cho các request có header `Host` khớp với 1 trong 2 domain này.
- **`return 301 https://$host$request_uri;`** — trả về mã chuyển hướng vĩnh viễn (**301**) sang bản HTTPS của cùng URL. `$host` giữ nguyên domain client đang gõ (`example.com` hoặc `www.example.com`), `$request_uri` giữ nguyên toàn bộ path + query string.

**Vì sao dùng `return` thay vì `rewrite`?** `return` xử lý nhanh hơn vì không cần chạy qua engine regex rewrite của Nginx — với tác vụ redirect đơn giản như thế này, `return 301` là cách chuẩn và được khuyến nghị chính thức bởi Nginx, thay vì `rewrite ^ https://$host$request_uri permanent;`.

**Bẫy thường gặp:** dùng `301` (permanent) trong lúc còn đang test SSL. Vì `301` được trình duyệt **cache lại rất lâu**, nếu bạn redirect sai (VD: sai domain, SSL chưa cấu hình xong) thì user sẽ bị kẹt redirect sai đó ngay cả sau khi bạn đã sửa config, cho đến khi họ tự xoá cache trình duyệt. Nên dùng `302` (tạm thời) khi còn test, chuyển sang `301` khi đã chắc chắn hoạt động đúng.

---

## Server: PRODUCTION chính (HTTPS)

Đây là `server` block trung tâm, xử lý toàn bộ traffic thật của domain qua HTTPS. Mọi `location` bên trong đều nằm chung 1 server này, phân luồng theo path.

### Khai báo cổng, SSL, header bảo mật

```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

- **`listen 443 ssl http2;`** — lắng nghe cổng HTTPS chuẩn (443), bật SSL và giao thức HTTP/2 (nhanh hơn HTTP/1.1 nhờ multiplexing — gửi nhiều request trên cùng 1 connection).
- **`ssl_certificate` / `ssl_certificate_key`** — đường dẫn tới file chứng chỉ SSL công khai và private key tương ứng (thường lấy từ Let's Encrypt hoặc CA khác).
- **`ssl_protocols TLSv1.2 TLSv1.3;`** — chỉ cho phép 2 phiên bản TLS mới, tắt hẳn TLS 1.0/1.1 (đã cũ, có lỗ hổng bảo mật đã biết).
- **`ssl_prefer_server_ciphers on;`** — khi bắt tay SSL, ưu tiên thứ tự cipher suite do **server** quy định thay vì để client tự chọn — tránh việc client cũ ép server dùng cipher yếu.
- **`root` / `index`** — thư mục gốc chứa file frontend đã build (VD: `npm run build` của React/Vue) và file mặc định khi truy cập thư mục là `index.html`.
- **`add_header X-Frame-Options SAMEORIGIN always;`** — chặn website bị nhúng vào `<iframe>` từ domain khác, chống tấn công **clickjacking**.
- **`add_header X-Content-Type-Options nosniff always;`** — buộc trình duyệt tin tưởng đúng `Content-Type` server trả về, không tự đoán loại file — chống một số kiểu tấn công XSS lợi dụng việc trình duyệt "đoán sai" định dạng file.
- **`add_header Strict-Transport-Security ...;`** — header **HSTS**, báo trình duyệt: từ giờ luôn luôn truy cập domain này bằng HTTPS trong 1 năm (`max-age=31536000` giây), kể cả subdomain (`includeSubDomains`), không cho phép fallback về HTTP nữa dù user có gõ `http://`.
- **`always`** ở cuối mỗi `add_header` — đảm bảo header vẫn được gắn kể cả khi response là mã lỗi (4xx, 5xx), không chỉ riêng response 2xx thành công.

### GIAI ĐOẠN 1: Frontend SPA (React/Vue) — location gốc

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

- **`try_files $uri $uri/ /index.html;`** — Nginx thử lần lượt: có file khớp đúng `$uri` không? Có thư mục khớp `$uri/` không? Nếu cả 2 đều không có, trả về `/index.html`.
- **Vì sao bắt buộc phải có cho SPA:** với client-side routing (React Router, Vue Router), URL như `example.com/dashboard/settings` **không tồn tại** thành file thật trên server — toàn bộ routing được JS xử lý ở phía trình duyệt. Nếu không có `try_files`, Nginx sẽ trả `404` vì tìm file `dashboard/settings` không thấy. Fallback về `index.html` để JS load lên rồi tự điều hướng đúng route.

### GIAI ĐOẠN 2: `/static/` — file build cache dài hạn

```nginx
location /static/ {
    alias /usr/share/nginx/html/static/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

- **`alias` (khác `root`):** với `alias`, phần path khớp trong `location` (`/static/`) sẽ bị **thay thế hoàn toàn** bằng đường dẫn chỉ định, chứ không nối thêm vào như `root`. VD: request `/static/app.js` → map tới `/usr/share/nginx/html/static/app.js` (không lặp lại `static` 2 lần).
- **`expires 30d;`** — báo trình duyệt cache file này 30 ngày, không cần hỏi lại server trong khoảng thời gian đó.
- **`Cache-Control "public, immutable";`** — `public` cho phép cả các lớp cache trung gian (CDN, proxy) cũng được cache; `immutable` báo trình duyệt: file này **chắc chắn không đổi nội dung** trong thời gian cache, không cần gửi request kiểm tra lại (revalidate) dù user bấm F5.
- **Vì sao an toàn khi dùng `immutable`:** vì các file build (JS/CSS) thường được đặt tên kèm hash nội dung (VD: `app.a1b2c3.js`) — nếu code đổi, tên file cũng đổi theo, nên cache cũ không bao giờ bị "cũ sai".
- **`access_log off;`** — static file được request rất nhiều lần (mỗi lần load trang), ghi log hết sẽ làm phình file log rất nhanh mà không có nhiều giá trị phân tích — nên tắt log riêng cho path này.

### GIAI ĐOẠN 3: `/api/` — reverse proxy tới backend production

```nginx
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn conn_limit 20;

    proxy_pass http://api_backend/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

- **`limit_req zone=api_limit burst=20 nodelay;`** — áp dụng zone `api_limit` đã định nghĩa ở `http {}` (10 request/giây/IP). `burst=20` cho phép "dồn toa" tối đa 20 request vượt mức tạm thời (VD: user bấm nhanh nhiều lần) mà không bị chặn ngay; `nodelay` nghĩa là các request trong hạn `burst` được xử lý **ngay lập tức** thay vì bị Nginx giữ lại rồi nhả từ từ theo đúng rate — tránh cảm giác app bị "đơ" giả tạo.
- **`limit_conn conn_limit 20;`** — giới hạn tối đa **20 connection đồng thời** cho mỗi IP tới path này, chống 1 client mở quá nhiều kết nối song song làm nghẽn backend.
- **`proxy_pass http://api_backend/;`** — chuyển tiếp request sang nhóm upstream `api_backend` đã định nghĩa trước đó. **Điểm quan trọng:** dấu `/` ở cuối URL này nghĩa là Nginx sẽ **cắt bỏ phần `/api` trong path** trước khi forward. VD: client gọi `example.com/api/users` → backend nhận được `/users` (không còn `/api`). Nếu bỏ dấu `/` cuối (`proxy_pass http://api_backend;`), backend sẽ nhận nguyên `/api/users`.
- **`proxy_http_version 1.1;`** — dùng HTTP/1.1 khi giao tiếp với backend (mặc định Nginx dùng 1.0 nếu không khai báo), cần thiết để hỗ trợ keep-alive tới backend và một số tính năng khác như chunked transfer.
- **`proxy_set_header Host $host;`** — giữ nguyên header `Host` gốc mà client gửi, để backend biết chính xác domain nào đang được truy cập (quan trọng nếu 1 backend phục vụ nhiều domain).
- **`X-Real-IP` / `X-Forwarded-For`** — vì Nginx đứng giữa client và backend (reverse proxy), nếu không có 2 header này, backend sẽ thấy **mọi request đều đến từ IP của Nginx** thay vì IP thật của client. Hai header này "chuyển tiếp" IP gốc để backend log/xử lý đúng (VD: rate limit theo IP thật, chặn IP xấu...).
- **`X-Forwarded-Proto $scheme;`** — báo cho backend biết request gốc là `http` hay `https`, vì bản thân kết nối Nginx → backend nội bộ thường chỉ là `http` thường (không mã hoá, vì đã ở trong mạng riêng an toàn) — nếu thiếu header này, backend có thể tạo nhầm link redirect dùng sai giao thức.
- **`proxy_connect_timeout 5s;`** — thời gian tối đa chờ Nginx **kết nối được** tới backend. Nếu backend không phản hồi trong 5s để bắt tay kết nối, coi như fail.
- **`proxy_send_timeout` / `proxy_read_timeout 30s;`** — thời gian tối đa giữa 2 lần ghi/đọc dữ liệu liên tiếp với backend. Nếu backend xử lý quá lâu (VD: query DB chậm) và không gửi phản hồi trong 30s, Nginx sẽ ngắt và trả lỗi timeout cho client thay vì chờ vô hạn.

### GIAI ĐOẠN 4: `/staging/` — môi trường test, chặn public

```nginx
location /staging/ {
    allow 10.0.0.0/8;
    allow 203.0.113.10;
    deny all;

    auth_basic "Staging Area - Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;

    proxy_pass http://staging_backend/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    add_header Cache-Control "no-store" always;
}
```

- **`allow` / `deny`** — Nginx xét các dòng này **theo đúng thứ tự từ trên xuống**, dừng lại ở dòng đầu tiên khớp. Ở đây: cho phép dải IP nội bộ `10.0.0.0/8` (VD: VPN công ty), cho phép 1 IP văn phòng cụ thể, còn lại (`deny all;`) chặn hết — đảm bảo môi trường staging (thường chưa hoàn thiện, có thể lộ lỗi/dữ liệu test) không bị public truy cập được.
- **`auth_basic` / `auth_basic_user_file`** — thêm **lớp bảo vệ thứ 2**: kể cả đúng IP nội bộ, vẫn phải nhập user/password (HTTP Basic Auth) mới vào được. File `.htpasswd` chứa danh sách user:password đã mã hoá, tạo bằng lệnh `htpasswd`.
- **`add_header Cache-Control "no-store" always;`** — cấm mọi hình thức cache (trình duyệt lẫn CDN) cho toàn bộ response từ path này, vì code trên staging thay đổi liên tục — cache sai sẽ khiến tester thấy nhầm bản cũ.

### GIAI ĐOẠN 5: `/ws/` — WebSocket (chat, realtime, notification)

```nginx
location /ws/ {
    proxy_pass http://api_backend/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

- **`proxy_set_header Upgrade $http_upgrade;` + `proxy_set_header Connection "upgrade";`** — đây là **2 dòng bắt buộc** để proxy WebSocket hoạt động. WebSocket bắt đầu bằng 1 HTTP request bình thường có header `Upgrade: websocket`, sau đó "nâng cấp" kết nối đó thành kết nối 2 chiều liên tục (không phải request/response rời rạc như HTTP thường). Nếu thiếu 2 header này, Nginx sẽ xử lý request như HTTP thường và WebSocket handshake sẽ thất bại.
- **`proxy_read_timeout 3600s;`** — WebSocket giữ kết nối mở rất lâu (đôi khi cả tiếng đồng hồ, VD: user mở tab chat cả ngày). Timeout mặc định (thường 60s) sẽ khiến Nginx tự ngắt kết nối dù client/server vẫn hoạt động bình thường, gây rớt kết nối realtime liên tục. Set dài (1 giờ = 3600s) để tránh bị ngắt giữa chừng.

### GIAI ĐOẠN 6: `/health` — healthcheck nội bộ

```nginx
location = /health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
}
```

- **`location = /health`** — dấu `=` nghĩa là **khớp chính xác tuyệt đối** path `/health`, không khớp `/health/` hay `/health/anything`. Đây là kiểu match nhanh nhất trong Nginx (ưu tiên xử lý cao nhất, không cần duyệt qua regex).
- **`return 200 "ok\n";`** — trả thẳng response `200 OK` với nội dung `"ok"`, **không hề chạm tới backend thật**. Dùng để Docker/load balancer/monitoring tool kiểm tra "Nginx còn sống không" mà không tạo tải lên hệ thống phía sau.
- **`access_log off;`** — healthcheck thường được gọi liên tục (VD: mỗi 5-10 giây một lần từ Docker healthcheck), nếu log hết sẽ làm phình file log với những dòng vô nghĩa.

### Chặn truy cập file rác/nhạy cảm

```nginx
location ~ /\.(?!well-known) {
    deny all;
}
```

- **`location ~ ...`** — dấu `~` nghĩa là match theo **regex** (có phân biệt hoa thường).
- **`/\.(?!well-known)`** — regex này khớp bất kỳ path nào có dấu `.` ở đầu tên file/thư mục (VD: `.env`, `.git`, `.htaccess`, `.DS_Store`), **ngoại trừ** `.well-known` (dùng `(?!well-known)` — negative lookahead) vì thư mục `/.well-known/` cần được public để phục vụ việc xác thực domain cho SSL (Let's Encrypt) hoặc các chuẩn khác.
- **Vì sao quan trọng:** các file như `.env` (chứa biến môi trường, thường có password/API key), `.git` (toàn bộ lịch sử source code) nếu vô tình nằm trong thư mục `root` và không bị chặn, hacker có thể tải trực tiếp qua URL và đọc được thông tin nhạy cảm — đây là một trong những lỗi bảo mật phổ biến nhất khi deploy web thực tế.

**Bẫy thường gặp của cả block Production:**

- Quên đặt `location /staging/` **trước** hay **sau** `location /` không quan trọng bằng việc hiểu Nginx chọn location theo độ ưu tiên (`=` exact match → prefix dài nhất → regex theo thứ tự khai báo), không phải theo thứ tự viết trong file.
- Dùng chung `proxy_read_timeout` ngắn (30s) cho cả API thường lẫn WebSocket sẽ làm rớt kết nối realtime — đây là lý do `/ws/` phải tách `location` riêng với timeout riêng.
- Quên `access_log off;` cho `/static/` và `/health` khiến log file phình to rất nhanh trên site có traffic lớn, gây khó khăn khi cần tìm log lỗi thật sự.

---

# PHẦN 2 — GIẢI THÍCH TỪNG GIAI ĐOẠN (TẠI SAO VIẾT NHƯ VẬY)

## 2.1 `location /` — Frontend SPA

**Định nghĩa:** đây là entry point mặc định, phục vụ file tĩnh của frontend (React/Vue/Angular build).

**Tình huống thực tế:** người dùng vào `example.com/dashboard/settings` — file `dashboard/settings` không tồn tại thật trên ổ đĩa (nó là route xử lý bởi JavaScript). Nếu không có `try_files ... /index.html`, nginx trả 404 vì tìm không ra file.

**Bẫy thường gặp:**

- Quên `try_files` → SPA bị lỗi 404 khi refresh trang con (F5 ở `/dashboard`).
- Để `root` trỏ sai thư mục build (VD: trỏ vào source code thay vì thư mục `dist/build`).

## 2.2 `location /static/` — Static Assets

**Định nghĩa:** phục vụ file đã build, có hash trong tên (VD: `main.a3f8c1.js`) nên nội dung không đổi khi tên không đổi.

**Vì sao cache 30 ngày + `immutable`:** vì file có hash trong tên, nếu code đổi thì tên file cũng đổi → cache cũ không bao giờ "sai", an toàn để cache cực dài, giảm tải server và tăng tốc độ tải trang.

**Bẫy thường gặp:** dùng `root` thay vì `alias` sẽ bị lặp path (VD: `/static/static/app.js`) — quy tắc nhớ: `alias` thay thế hoàn toàn phần location, `root` thì nối thêm vào.

## 2.3 `location /api/` — Reverse Proxy Production

**Định nghĩa:** forward toàn bộ request bắt đầu bằng `/api/` sang cụm backend thật (upstream), tự động cân bằng tải.

**Tình huống thực tế:**

- Frontend gọi `example.com/api/users` → nginx forward thành `http://api_backend/users` (đã strip `/api`).
- 3 container backend chạy song song, `least_conn` đảm bảo container nào đang rảnh nhận request trước — tránh 1 container quá tải trong khi 2 cái kia rảnh.

**Vì sao có `keepalive 32` trong upstream:** nếu không có, mỗi request nginx phải mở 1 TCP connection mới tới backend rồi đóng lại — tốn CPU và tăng latency. `keepalive` giữ sẵn pool connection tái sử dụng.

**Vì sao có `limit_req` + `limit_conn`:** chống 1 IP spam API (bot, scraper, DDoS nhỏ lẻ) làm sập backend thật.

**Bẫy thường gặp:**

- Quên `proxy_set_header X-Real-IP` → backend log sai IP client, tưởng tất cả traffic đến từ nginx.
- `proxy_pass http://api_backend;` (không có `/` cuối) sẽ **giữ nguyên** `/api/` khi forward, backend cần định nghĩa thêm route `/api/...` — dễ gây lỗi 404 nếu backend không ngờ tới. Đây là lỗi devop mới hay dính nhất.

## 2.4 `location /staging/` — Môi trường Test

**Định nghĩa:** một cổng riêng, dùng chung domain/SSL với production nhưng trỏ sang backend khác (code đang test, chưa release).

**Tình huống thực tế:** team QA cần test bản mới trước khi merge, nhưng công ty không muốn tốn thêm domain/SSL riêng → gắn `/staging/` vào domain chính, giới hạn truy cập bằng:

1. `allow/deny` theo IP (chỉ nội bộ, VPN công ty).
2. `auth_basic` (thêm lớp mật khẩu) — phòng trường hợp IP bị lộ hoặc dùng mạng ngoài.

**Vì sao `Cache-Control: no-store`:** staging code đổi liên tục trong ngày, nếu bị cache lại (browser hoặc CDN) thì QA sẽ test nhầm bản cũ — rất nguy hiểm khi báo cáo bug sai.

**Cách làm thực tế hơn khi lên production thật:** dùng subdomain riêng (`staging.example.com`) thay vì path, để tách hẳn cookie/session, tránh việc JS code trong SPA cộng path `/staging` vào các asset path gây lỗi. Cách dùng `location /staging/` phù hợp cho demo nhanh hoặc hệ thống nhỏ.

**Bẫy thường gặp:**

- Quên chặn `allow/deny` → để lộ staging (thường có bug, thiếu bảo mật) ra internet.
- Backend staging không handle prefix `/staging` → phải dùng `proxy_pass http://staging_backend/;` (có `/` để nginx tự strip prefix), hoặc cấu hình biến môi trường `BASE_PATH=/staging` trong app.

## 2.5 `location /ws/` — WebSocket

**Định nghĩa:** kết nối bền (persistent connection) dùng cho chat, thông báo realtime, live tracking...

**Vì sao cần `Upgrade` + `Connection: upgrade`:** WebSocket bắt đầu bằng HTTP handshake rồi "nâng cấp" giao thức — thiếu 2 header này, nginx coi đây là HTTP thường và đóng kết nối ngay, client sẽ thấy lỗi kết nối liên tục bị rớt (reconnect loop).

**Vì sao `proxy_read_timeout` dài (3600s):** mặc định nginx timeout connection sau ~60s không có data mới. WebSocket có thể im lặng lâu (chờ tin nhắn) mà vẫn cần giữ kết nối sống — timeout ngắn sẽ làm app "tự ngắt kết nối" dù không ai đóng cả.

## 2.6 `location = /health` — Healthcheck

**Định nghĩa:** endpoint nội bộ để Docker/K8s/Load Balancer kiểm tra "server còn sống không", không phải nghiệp vụ thật.

**Vì sao `=` (exact match):** match chính xác `/health`, không match `/health/abc` — ưu tiên cao nhất, xử lý nhanh nhất vì không cần regex.

**Vì sao `access_log off`:** healthcheck có thể gọi mỗi vài giây → nếu ghi log sẽ làm phình file log rất nhanh mà không có giá trị phân tích gì.

## 2.7 Chặn file nhạy cảm (`.env`, `.git`)

**Tình huống thực tế:** rất nhiều vụ lộ `.env` (chứa DB password, API key) vì nginx serve file tĩnh mà quên chặn dotfile — hacker chỉ cần gõ `example.com/.env` là lấy được toàn bộ secret.

---

# PHẦN 3 — CÁC KỊCH BẢN THỰC TẾ KHÁC (MỞ RỘNG)

## 3.1 Blue-Green Deployment / Canary Release

Dùng `weight` trong upstream để đẩy traffic dần dần sang version mới, giảm rủi ro khi release:

```nginx
upstream api_backend {
    server api-v1:4000 weight=9;   # 90% traffic vẫn vào bản cũ
    server api-v2:4000 weight=1;   # 10% traffic thử bản mới
}
```

Theo dõi log/error rate của `api-v2`, nếu ổn thì tăng dần weight cho tới khi 100% chuyển hẳn.

## 3.2 Chặn Bad Bot / Scraper

```nginx
if ($http_user_agent ~* (bot|crawler|spider|scrapy)) {
    return 403;
}
```

> Lưu ý: `if` trong nginx nổi tiếng "nguy hiểm" nếu lồng vào nhiều logic phức tạp (nginx docs gọi là "if is evil"), chỉ nên dùng cho check đơn giản như trên, không lồng thêm `proxy_pass` bên trong `if`.

## 3.3 Cache Response API (giảm tải backend)

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/products {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;      # cache response 200 trong 5 phút
    proxy_cache_use_stale error timeout updating;  # backend lỗi vẫn trả cache cũ thay vì die
    add_header X-Cache-Status $upstream_cache_status;  # debug: HIT/MISS/EXPIRED
    proxy_pass http://api_backend;
}
```

Dùng cho API ít thay đổi (danh sách sản phẩm, danh mục) — giảm tải backend đáng kể mà không cần sửa code backend.

## 3.4 Giới hạn theo endpoint nhạy cảm (login, OTP)

```nginx
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=3r/m;

location /api/auth/login {
    limit_req zone=login_limit burst=2 nodelay;
    proxy_pass http://api_backend;
}
```

Chống brute-force đăng nhập ngay ở tầng nginx, backend không cần tự viết rate-limit.

---

# PHẦN 4 — CHECKLIST TỐI ƯU HIỆU NĂNG & BẢO MẬT

| Mục tiêu                  | Directive                                              | Ghi chú                                                      |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Tận dụng CPU              | `worker_processes auto;`                               | Luôn để auto trừ khi có lý do đặc biệt                       |
| Giảm băng thông           | `gzip on; gzip_types ...;`                             | Không nén ảnh/video, đã compressed sẵn                       |
| Giảm mở/đóng TCP liên tục | `keepalive` trong upstream + `proxy_http_version 1.1;` | Bắt buộc khi traffic cao                                     |
| Tránh 1 IP phá server     | `limit_req_zone`, `limit_conn_zone`                    | Áp riêng cho login/API nhạy cảm                              |
| Giảm tải backend          | `proxy_cache`                                          | Chỉ áp cho endpoint đọc, không cache endpoint có side-effect |
| Bảo mật header            | `server_tokens off;`, `X-Frame-Options`, `HSTS`        | Chuẩn OWASP cơ bản                                           |
| Static asset nhanh        | `sendfile on; tcp_nopush on;` + `expires` dài          | Kết hợp cache-busting bằng hash filename                     |
| Tránh lộ secret           | Chặn `\.env`, `\.git`                                  | Luôn thêm block này cho mọi server serve static              |
| WebSocket ổn định         | `proxy_read_timeout` dài + `Upgrade` header            | Test kỹ khi network chập chờn                                |
| SSL nhanh & an toàn       | `ssl_protocols TLSv1.2 TLSv1.3;`                       | Bỏ hẳn TLS 1.0/1.1 (không an toàn, chậm hơn)                 |

---

# PHẦN 5 — LỆNH KIỂM TRA & DEBUG (DÙNG HẰNG NGÀY)

```bash
# Test cú pháp config trước khi reload (LUÔN làm bước này trước khi deploy)
nginx -t

# Reload config không downtime (không restart container/process)
nginx -s reload

# Xem log lỗi realtime khi debug
tail -f /var/log/nginx/error.log

# Xem log truy cập realtime, lọc theo status lỗi
tail -f /var/log/nginx/access.log | grep -E " (4|5)[0-9]{2} "

# Kiểm tra location nào đang match 1 URL cụ thể (dùng khi rối logic location)
curl -I https://example.com/api/users

# Test riêng backend upstream (bỏ qua nginx) để xác định lỗi ở đâu
curl -I http://api1:4000/users
```

**Quy trình debug chuẩn khi API lỗi 502/504:**

1. `curl` thẳng vào backend container (bỏ qua nginx) → nếu lỗi thì backend hỏng, không phải nginx.
2. Nếu backend OK nhưng qua nginx vẫn lỗi → kiểm tra `proxy_pass` có đúng port/tên service không (đặc biệt trong Docker network).
3. Check `error.log` — 502 thường do backend không phản hồi hoặc DNS trong Docker network sai tên service; 504 thường do `proxy_read_timeout` quá ngắn so với thời gian xử lý thật của backend.

---

# TỔNG KẾT — TƯ DUY CHIA GIAI ĐOẠN 1 CONFIG NGINX

Khi viết 1 file nginx config thực chiến, luôn tự hỏi theo thứ tự:

1. **Request này thuộc domain nào?** → `server_name`
2. **Có cần HTTPS redirect không?** → block `listen 80` riêng để redirect
3. **Request này là file tĩnh hay cần xử lý động?** → `location /` (SPA) vs `location /api/` (proxy)
4. **Có cần giới hạn ai được vào không?** → `allow/deny`, `auth_basic` (như `/staging/`)
5. **Có cần giữ kết nối lâu không?** → WebSocket cần `Upgrade` + timeout dài
6. **Có cần cache không, cache bao lâu?** → static cache dài hạn, API cache ngắn hạn hoặc không cache
7. **Có bị lộ gì nhạy cảm không?** → chặn dotfile, tắt `server_tokens`
8. **Có giới hạn traffic bất thường không?** → `limit_req`, `limit_conn`

Nắm được 8 câu hỏi này, bạn đọc bất kỳ file `nginx.conf` nào trong thực tế cũng hiểu ngay logic của người viết trước, và tự viết được config cho hệ thống của riêng mình mà không cần học thuộc directive.

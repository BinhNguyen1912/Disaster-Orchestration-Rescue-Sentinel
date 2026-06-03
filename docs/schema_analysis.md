# Phân tích Chi tiết Toàn bộ Schema Cơ sở dữ liệu (Prisma)

Tài liệu này giải thích chi tiết ý nghĩa của tất cả các bảng (Models), các trường (Fields) và các hằng số (Enums) trong hệ thống cứu hộ thiên tai.

---

## 1. PHÂN TÍCH CHI TIẾT CÁC BẢNG (MODELS)

### 🗺️ 1.1. Đơn vị Hành chính & Địa lý

#### **Model: Province (Tỉnh/Thành phố)**
*Ý nghĩa: Quản lý cấp hành chính cao nhất, là "vùng chứa" cho mọi dữ liệu khác.*
- `id`: Định danh nội bộ (tự tăng).
- `code`: Mã tỉnh theo quy định nhà nước (dùng để tra cứu/mapping dữ liệu chính phủ).
- `name`: Tên đầy đủ (ví dụ: "Tỉnh Thừa Thiên Huế").
- `shortName`: Tên ngắn gọn hoặc mã viết tắt.
- `boundary`: Ranh giới địa lý (Kiểu MultiPolygon) dùng để vẽ vùng quản lý trên bản đồ.
- `centerPoint`: Tọa độ trung tâm để định vị nhanh tỉnh trên bản đồ.
- `isActive`: Đánh giá xem tỉnh này đã được kích hoạt sử dụng hệ thống hay chưa.
- `createdAt`: Thời gian tạo bản ghi.
- `onboardedAt`: Ngày tỉnh chính thức đưa vào vận hành hệ thống.
- `metadata`: Dữ liệu bổ sung dạng JSON (dân số, diện tích...).

#### **Model: AdministrativeUnit (Quận/Huyện/Xã/Thôn)**
*Ý nghĩa: Quản lý các đơn vị hành chính cấp dưới theo cấu trúc cây.*
- `id`: Định danh UUID.
- `provinceId`: Thuộc tỉnh nào.
- `parentId`: Liên kết đến đơn vị cấp trên (Huyện liên kết với Tỉnh, Xã liên kết với Huyện).
- `type`: Phân loại cấp bậc (DISTRICT, COMMUNE, WARD, HAMLET).
- `code`: Mã định danh hành chính của đơn vị đó.
- `name`: Tên đơn vị.
- `boundary / centerPoint`: Dữ liệu không gian tương tự Province nhưng ở cấp độ nhỏ hơn.

---

### 👤 1.2. Người dùng và Phân quyền (Users & RBAC)

#### **Model: User (Người dùng)**
*Ý nghĩa: Lưu trữ danh tính, thông tin liên lạc và vị trí của mọi người dùng.*
- `id`: Định danh UUID.
- `provinceId / adminUnitId`: Vị trí hành chính đăng ký.
- `fullName`: Họ và tên đầy đủ.
- `nationalId`: Số căn cước công dân (CCCD). Duy nhất.
- `nationalIdVerified`: Đã đối soát CCCD với cơ sở dữ liệu quốc gia chưa.
- `dateOfBirth`: Ngày sinh.
- `gender`: Giới tính (MALE, FEMALE, OTHER).
- `phone`: Số điện thoại chính. Duy nhất.
- `phoneVerified`: Trạng thái xác minh số điện thoại.
- `email / emailVerified`: Địa chỉ email và trạng thái xác minh.
- `avatarUrl`: Đường dẫn ảnh đại diện.
- `nationalIdFrontUrl / nationalIdBackUrl`: Ảnh chụp mặt trước/sau CCCD để kiểm duyệt.
- `addressDetail`: Địa chỉ nhà cụ thể.
- `homeLocation`: Vị trí nhà ở cố định (Point). Rất quan trọng để biết dân đang ở đâu khi có lụt.
- `currentLocation`: Vị trí thực tế cập nhật từ GPS điện thoại (Point).
- `trustScore`: Điểm uy tín. Giúp hệ thống biết báo cáo của người này có đáng tin hay không.
- `isVerified`: Tài khoản đã được kiểm duyệt chưa.
- `isActive`: Trạng thái hoạt động.
- `fcmToken`: Mã định danh để gửi thông báo đẩy (Push Notification) qua app.
- `createdAt / updatedAt / lastSeenAt / deletedAt`: Các trường theo dõi thời gian và trạng thái (soft delete).

#### **Model: Permission (Quyền hạn)**
*Ý nghĩa: Định nghĩa các hành động cụ thể trong hệ thống.*
- `id`: Định danh UUID.
- `code`: Mã quyền (ví dụ: `USER_CREATE`, `SOS_VIEW`).
- `name`: Tên hiển thị.
- `module`: Quyền này thuộc chức năng nào (ví dụ: "Auth", "SOS").
- `description`: Mô tả chi tiết.
- `isSystem`: Quyền mặc định của hệ thống, không được sửa/xóa.
- `sortOrder`: Thứ tự sắp xếp khi hiển thị UI.

#### **Model: Role (Vai trò)**
*Ý nghĩa: Nhóm các quyền lại thành một chức danh.*
- `id`: Định danh UUID.
- `provinceId`: Tỉnh tạo ra vai trò này (nếu null là cấp toàn hệ thống).
- `code`: Mã vai trò. Duy nhất.
- `name`: Tên vai trò (ví dụ: "Quản trị viên Tỉnh").
- `description`: Mô tả.
- `level`: Cấp độ ưu tiên (1 là thấp nhất). Dùng để phân cấp quản lý (cấp thấp không thể xóa cấp cao).
- `isSystem`: Vai trò hệ thống tạo sẵn.
- `isActive`: Trạng thái.
- `createdBy`: Ai tạo ra vai trò này.

#### **Model: RolePermission**
*Ý nghĩa: Bảng trung gian nối Role và Permission (Mối quan hệ n-n).*
- `roleId / permissionId`: Khóa ngoại.
- `grantedBy / grantedAt`: Ai cấp và cấp khi nào.

#### **Model: UserRole (Gán quyền cho người dùng)**
*Ý nghĩa: Gán vai trò cho user theo từng tỉnh cụ thể.*
- `id`: Định danh UUID.
- `userId / roleId / provinceId`: Người dùng có thể là "Admin" ở tỉnh A nhưng chỉ là "User" ở tỉnh B.
- `assignedBy / assignedAt`: Người gán và thời điểm.
- `expiresAt`: Ngày hết hạn quyền (rất hữu ích cho các tình nguyện viên hỗ trợ mùa lũ ngắn hạn).
- `isActive`: Trạng thái vai trò.
- `revokedAt / revokedBy`: Lịch sử thu hồi quyền.

---

### 🏠 1.3. Hồ sơ Hộ gia đình (HouseholdProfile)

*Ý nghĩa: Nắm bắt đặc điểm dân cư từng nhà để ưu tiên cứu hộ.*
- `id`: Định danh UUID.
- `residentId`: Liên kết với chủ hộ (User). Duy nhất.
- `provinceId / adminUnitId`: Vị trí hành chính.
- `addressDetail / homeLocation`: Địa chỉ và tọa độ nhà.
- `floorCount`: Số tầng của nhà (Nhà nhiều tầng thì an toàn hơn khi ngập, có chỗ sơ tán tại chỗ).
- `totalMembers`: Tổng số người trong nhà.
- `elderlyCount / childrenCount / pregnantCount / disabledCount`: Số lượng người già, trẻ em, phụ nữ có thai, người khuyết tật. Đây là cơ sở để thuật toán phân loại ưu tiên cứu hộ khẩn cấp.
- `hasChronicIllness`: Có người bệnh mãn tính không (cần chuẩn bị thuốc men đặc biệt khi tiếp tế).
- `healthNotes`: Ghi chú sức khỏe.
- `assetValueLevel`: Mức độ tài sản (LOW, MEDIUM, HIGH) để thống kê thiệt hại.
- `businessType / productionType`: Có cơ sở kinh doanh/sản xuất không.
- `waterUsageLevel`: Mức tiêu thụ nước.
- `nearManhole / nearWasteSite / nearProduction / nearCanal`: Đánh giá rủi ro xung quanh. Vị trí gần hố ga, kênh rạch sẽ ngập trước và nguy hiểm hơn.
- `envNotes`: Ghi chú môi trường.
- `updatedBy`: Người cập nhật hồ sơ gần nhất.

---

### 🚒 1.4. Đội Cứu hộ (Rescue Teams)

#### **Model: RescueTeam (Đội cứu hộ)**
*Ý nghĩa: Quản lý các đơn vị tham gia ứng phó.*
- `id`: Định danh UUID.
- `provinceId / adminUnitId`: Địa bàn hoạt động chính.
- `name`: Tên đội.
- `code`: Mã đội duy nhất.
- `teamType`: Loại đội (DAN_PHONG, PCCC, QUAN_SU, TINH_NGUYEN, Y_TE, TONG_HOP).
- `status`: Trạng thái (AVAILABLE, BUSY, OFF_DUTY, STANDBY).
- `currentLocation`: Vị trí hiện tại (GPS).
- `baseLocation`: Vị trí đóng quân/trạm trực cố định.
- `coverageArea`: Vùng đội phụ trách (Polygon).
- `maxCapacity`: Sức chứa tối đa (người hoặc phương tiện).
- `activeCasesCount`: Số vụ việc đang xử lý (dùng để thuật toán chia đều việc cho các đội rảnh).
- `specializations`: Các kỹ năng đặc biệt (ví dụ: "Lặn", "Sơ cứu", "Lái cano").
- `equipment`: Danh sách thiết bị (Lưu JSON để linh hoạt thêm bớt thuyền, phao, máy bơm).
- `leaderId`: ID của đội trưởng.
- `totalMissions / totalRescued / totalHoursActive`: Thống kê thành tích của đội (số nhiệm vụ, số người cứu, số giờ hoạt động).

#### **Model: RescueTeamMember (Thành viên đội)**
*Ý nghĩa: Quản lý nhân sự trong đội.*
- `teamId / userId`: Liên kết.
- `roleInTeam`: Chức vụ trong đội (LEADER, DEPUTY_LEADER, MEMBER).
- `joinedAt / leftAt`: Lịch sử công tác.
- `isActive`: Trạng thái hoạt động.
- `specializations`: Kỹ năng riêng của thành viên.
- `missionsCount / rescuedCount / hoursActive`: Thống kê cá nhân.

#### **Model: DutyLog (Nhật ký trực)**
*Ý nghĩa: Theo dõi lịch trực và kết quả.*
- `teamId / userId`: Ai trực, đội nào.
- `dutyStart / dutyEnd`: Ca trực.
- `status`: ACTIVE, COMPLETED, CANCELLED.
- `sosReceived / sosResolved / rescuedCount`: Hiệu suất trong ca trực đó.
- `notes`: Ghi chú giao ca.

#### **Model: TeamAchievement (Thành tích Đội)**
*Ý nghĩa: Ghi nhận khen thưởng.*
- `title / description`: Tên và mô tả danh hiệu.
- `achievedAt / awardedBy`: Ngày đạt được và ai trao.
- `evidenceUrl`: Ảnh/video minh chứng thành tích.
- `category`: Loại thành tích (RESCUE, MEDICAL, LOGISTICS, TRAINING...).

---

### 🆘 1.5. SOS và Báo cáo (SOS & Reports)

#### **Model: SosRequest (Yêu cầu cứu trợ khẩn cấp)**
*Ý nghĩa: Trung tâm điều phối ứng cứu.*
- `id`: UUID.
- `provinceId / adminUnitId / userId`: Thông tin hành chính và người gửi.
- `deviceId`: Nếu gửi qua thiết bị IoT cứng.
- `location`: Tọa độ thực tế lúc gửi SOS (Point).
- `requestType`: Loại cứu trợ (MEDICAL, FOOD, RESCUE, STUCK, OTHER).
- `status`: Trạng thái xử lý (PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, FALSE_ALARM, CANCELLED).
- `severity`: Độ khẩn cấp (LOW, MEDIUM, HIGH, CRITICAL).
- `imageUrls`: Ảnh hiện trường người dân gửi lên.
- `description`: Mô tả tình hình.
- `source`: Nguồn gửi (APP, IOT_SMS, IOT_MQTT, WEB).
- `assignedTeamId / assignedBy / assignedAt`: Thông tin đội tiếp nhận và người điều phối.
- `dispatchMethod`: Cách điều phối (AUTO - AI/Hệ thống tự chia, MANUAL - Người vận hành chọn).
- `resolvedAt / resolvedBy / resolutionNotes`: Lịch sử giải quyết.
- `clusterId`: ID dùng để nhóm các yêu cầu ở gần nhau lại (Clustering) để cứu hộ một lần cho nhanh, tối ưu lộ trình cano.

#### **Model: FloodReport (Báo cáo lụt từ cộng đồng)**
*Ý nghĩa: Cảnh báo từ cộng đồng (Crowdsourcing).*
- `location`: Vị trí ngập.
- `reportType`: Loại sự cố (FLOODED_ROAD, RISING_WATER, FALLEN_TREE, POWER_OUT, LANDSLIDE...).
- `waterDepthCm`: Mực nước ngập đo được (cm).
- `imageUrls / description`: Hình ảnh và mô tả.
- `status`: PENDING, VERIFIED (Đã xác minh), DISMISSED (Bác bỏ).
- `verifiedBy / verifiedAt`: Ai xác minh tin này đúng.
- `confirmationCount`: Số người khác đã bấm "Xác nhận tin này đúng" (Tăng độ tin cậy).
- `isCommunityAlert`: Đánh dấu là tin báo động để hiển thị rộng rãi cho toàn cộng đồng.

#### **Model: Casualty (Thông tin nạn nhân)**
*Ý nghĩa: Theo dõi thương vong.*
- `sosRequestId / rescueTeamId`: Nạn nhân thuộc vụ SOS nào, do đội nào xử lý.
- `location / incidentAt`: Vị trí và thời gian gặp nạn.
- `status`: Tình trạng (DECEASED - Tử vong, INJURED - Thương tích, MISSING - Mất tích, SAFE - An toàn, EVACUATED - Đã sơ tán).
- `victimName / victimNationalId / victimAge / victimGender / victimAddress / victimUserId`: Thông tin định danh nạn nhân.
- `injuryDescription / cause`: Mô tả vết thương và Nguyên nhân (DROWNING - Đuối nước, COLLAPSE - Sập nhà, LANDSLIDE - Sạt lở, ELECTRIC - Điện giật...).
- `hospitalTransferredTo`: Bệnh viện tiếp nhận.
- `isConfirmed / confirmedBy`: Đã xác thực tình trạng chưa (tránh báo tử nhầm).

---

### 🌪️ 1.6. Sự kiện & Quyên góp

#### **Model: DisasterEvent (Sự kiện thiên tai)**
*Ý nghĩa: Quản lý thông tin tổng thể của một đợt thiên tai lớn.*
- `name`: Tên trận bão/lụt (ví dụ: "Bão Yagi").
- `eventType`: Loại hình (FLOOD, STORM, LANDSLIDE, TIDAL_SURGE, DROUGHT...).
- `startedAt / endedAt`: Thời gian diễn ra.
- `affectedArea`: Toàn bộ vùng ảnh hưởng (MultiPolygon).
- `totalDeceased / totalInjured / totalMissing / totalSafe / totalEvacuated`: Thống kê tổng số người.
- `estimatedDamageVnd`: Ước tính tổng thiệt hại bằng tiền (BigInt).
- `housesDamaged / housesDestroyed / cropsDamageHa`: Thống kê tài sản.
- `status`: ONGOING, RESOLVED, ARCHIVED.

#### **Model: Donation (Quyên góp)**
*Ý nghĩa: Quản lý dòng tiền và nhu yếu phẩm quyên góp.*
- `donorUserId`: Người quyên góp (nếu đăng nhập).
- `donorName / Phone / Email`: Thông tin người quyên góp ngoài.
- `donorType`: Cá nhân, Tổ chức hoặc Ẩn danh.
- `donationType`: Loại đóng góp (MONEY, GOODS, FOOD, MEDICINE, EQUIPMENT...).
- `amountVnd`: Số tiền quyên góp (Dùng BigInt để lưu số tiền rất lớn).
- `goodsDescription / goodsQuantity`: Chi tiết hàng hóa.
- `status`: PLEDGED (Hứa/Đang chờ), RECEIVED (Đã nhận vào kho/Tài khoản), DISTRIBUTED (Đã phát cho dân).
- `receivedAt / receivedBy / receiptImageUrl`: Ghi nhận lúc tiếp nhận.
- `distributedAt / distributedBy / distributionImageUrl`: Ghi nhận lúc phân phát (Minh bạch).
- `isPublic / message`: Lời nhắn và trạng thái công khai.

#### **Model: DonationCampaign (Chiến dịch quyên góp)**
*Ý nghĩa: Kêu gọi gây quỹ.*
- `title / description`: Tên và chi tiết chiến dịch.
- `targetAmountVnd / currentAmountVnd`: Mục tiêu và số tiền hiện có.
- `status`: ACTIVE, PAUSED, COMPLETED, CANCELLED.
- `bankAccountNumber / bankName / bankAccountName / qrCodeUrl`: Thông tin chuyển khoản (tích hợp QR thanh toán nhanh).

---

### 💬 1.7. Thông tin liên lạc

#### **Model: Message (Tin nhắn/Thông báo)**
*Ý nghĩa: Gửi cảnh báo, điều phối.*
- `messageType`: Loại (BROADCAST - Phát thanh toàn khu vực, GROUP - Nhóm cứu hộ, DIRECT - Cá nhân, SYSTEM_ALERT - Cảnh báo tự động).
- `channel`: Kênh gửi (PUSH_NOTIFICATION, IN_APP, SMS, ALL).
- `title / content / imageUrl`: Nội dung.
- `targetType`: Đối tượng nhận (ALL_PROVINCE, SPECIFIC_AREA, TEAM, INDIVIDUAL, ROLE).
- `targetRoles`: Mảng các Role nhận tin.
- `sentCount / readCount`: Thống kê số người nhận/đọc.

#### **Model: MessageRead**
*Ý nghĩa: Bảng trung gian theo dõi chính xác User nào đã đọc tin nhắn nào lúc mấy giờ.*

---

### 📡 1.8. GIS, Hạ tầng & IoT

#### **Model: FloodZone (Vùng ngập lụt)**
*Ý nghĩa: Dữ liệu không gian về các điểm đen ngập lụt.*
- `name`: Tên khu vực.
- `boundary`: Đa giác ranh giới vùng ngập (Polygon).
- `severityLevel`: Cấp độ ngập nguy hiểm (ví dụ: 1 đến 5).
- `floodFrequency`: Tần suất (RARE, OCCASIONAL, FREQUENT, VERY_FREQUENT).
- `avgDepthCm`: Độ sâu ngập trung bình.
- `lastFloodedAt / floodReason`: Lần ngập gần nhất và nguyên nhân (Mưa, Triều cường, Vỡ đê...).

#### **Model: InfrastructureLayer (Hạ tầng)**
*Ý nghĩa: Quản lý bản đồ hạ tầng tiêu thoát nước và công trình phòng chống thiên tai.*
- `type`: Phân loại (MANHOLE - Hố ga, DRAIN_LINE - Đường ống, CANAL - Kênh rạch, LEVEE - Đê, PUMPING_STATION - Trạm bơm, SHELTER - Điểm tránh trú, WASTE_SITE - Bãi rác).
- `location`: Tọa độ hoặc đường vẽ hạ tầng (Geometry).
- `status`: Tình trạng hoạt động (NORMAL, DAMAGED, FLOODED, UNDER_MAINTENANCE).
- `lastDredgedAt / lastFloodedAt / lastMaintainedAt`: Lịch sử bảo trì, nạo vét cống (cực kỳ quan trọng để đánh giá năng lực tiêu thoát nước).

#### **Model: WeatherAlert (Cảnh báo thời tiết)**
*Ý nghĩa: Tích hợp dữ liệu khí tượng.*
- `source`: Nguồn cấp dữ liệu (OPEN_METEO, OPENWEATHERMAP, NCHMF - VN...).
- `alertType`: HEAVY_RAIN, STORM, FLOOD, TIDAL_SURGE...
- `area`: Vùng bị cảnh báo (Polygon).
- `severityLevel`: Mức độ cảnh báo.
- `issuedAt / expiresAt`: Thời gian hiệu lực.
- `rawData`: Lưu trữ nguyên gốc dữ liệu JSON từ API đối tác.
- `isTriggeredIot`: Đánh dấu hệ thống đã tự động kích hoạt loa/còi báo động IoT tại hiện trường chưa.

#### **Model: IotDevice (Thiết bị IoT)**
*Ý nghĩa: Quản lý thiết bị phần cứng (như loa cảnh báo, phao cứu sinh thông minh, cảm biến mực nước).*
- `serialNumber`: Số sê-ri định danh phần cứng.
- `lastLocation / lastSeenAt`: Vị trí và thời gian online cuối cùng.
- `batteryLevel`: Phần trăm pin (để biết khi nào cần sạc/thay pin).
- `simPhoneNumber`: Số điện thoại SIM 4G gắn trong thiết bị (dùng để gửi SMS dự phòng).
- `firmwareVersion`: Phiên bản phần mềm của thiết bị.

---

### 🗒️ 1.9. Nhật ký hệ thống

#### **Model: AuditLog (Nhật ký hành động)**
*Ý nghĩa: Vết hệ thống để phục vụ an ninh và truy cứu trách nhiệm.*
- `action`: Thao tác (CREATE, UPDATE, DELETE).
- `resourceType / resourceId`: Tên bảng và ID của bản ghi bị tác động.
- `ipAddress / userAgent`: Địa chỉ IP mạng và thông tin trình duyệt của người thực hiện.
- `metadata`: Các dữ liệu cũ/mới để đối chiếu.

---

## 2. NHẬN XÉT TỔNG THỂ VỀ KIẾN TRÚC

1.  **Thiết kế Multi-tenancy (Đa chi nhánh/Đa tỉnh):** Hầu hết các bảng trọng yếu đều có trường `provinceId`. Điều này cực kỳ khôn ngoan vì nó cho phép triển khai 1 hệ thống duy nhất (SaaS) phục vụ toàn quốc, nhưng dữ liệu của tỉnh nào thì tỉnh đó tự quản lý độc lập, tối ưu bảo mật và phân quyền.
2.  **Sức mạnh Không gian mạng (PostGIS):** Việc thiết kế kiểu `geometry` (Point, Polygon) len lỏi vào từng model (nhà ở, đội cứu hộ, SOS, vùng ngập) biến hệ thống thành một bản đồ chiến thuật thời gian thực.
3.  **Tập trung vào tính nhân văn & đối tượng yếu thế:** Model `HouseholdProfile` khai báo cụ thể số người già, trẻ em, khuyết tật. Đây là thiết kế "Human-centered", giúp hệ thống hoặc AI có cơ sở dữ liệu để tự động xếp hạng ưu tiên ai cần cứu trước.
4.  **Tích hợp Đa nền tảng & Mở rộng:** Hệ thống chuẩn bị sẵn sàng giao tiếp không chỉ giữa người với người (App/Web) mà còn giữa người với máy (IoT SMS, MQTT). `dispatchMethod` có auto/manual mở đường cho việc áp dụng AI vào điều phối lực lượng.
5.  **Minh bạch trong Từ thiện:** Các bảng Donation được cấu trúc vòng đời chặt chẽ (Hứa -> Đã nhận -> Đã phân phát) kết hợp ảnh minh chứng (`receiptImageUrl`, `distributionImageUrl`), giải quyết triệt để bài toán niềm tin trong cứu trợ.
6.  **Toàn vẹn và Bền bỉ (Resilience):** Có `AuditLog` để truy vết, `soft delete` (deletedAt) ở bảng User, cơ chế `trustScore` để chống tin giả.
```

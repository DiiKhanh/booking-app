# MOBILE.md — StayEase React Native Expo App

> Cập nhật: 2026-04-16
> Expo SDK ~54 · React Native 0.81 · Expo Router v4 · NativeWind v4 · Zustand v5 · React Query v5

---

## 1. Audience & Use Case

Mobile app phục vụ cả 3 roles, mỗi role có tab bar và màn hình riêng:

| Role | Mô Tả |
|------|-------|
| **Guest** | Tìm kiếm khách sạn (text + bản đồ) · Xem chi tiết · Đặt phòng · Thanh toán · Theo dõi Saga real-time · Quản lý bookings · Chat với owner · Nhận notifications |
| **Owner** | Dashboard nhanh · Quản lý khách sạn/phòng/tồn kho từ điện thoại · Xem reservations · Chat với khách |
| **Admin** | Duyệt khách sạn · Quản lý users · Giám sát system health |

---

## 2. Tech Stack

| Thư Viện | Version | Mục Đích |
|----------|---------|----------|
| Expo SDK | ~54.0 | Platform wrapper |
| React Native | 0.81.x | UI framework |
| Expo Router | ~4.0 | File-based routing |
| NativeWind | v4 | TailwindCSS cho React Native |
| Zustand | v5 | Global state |
| TanStack Query | v5 | Server state + caching |
| React Hook Form | v7 | Form management |
| Zod | v3 | Schema validation (**v3**, khác web dùng v4) |
| Axios | v1 | HTTP client |
| expo-secure-store | ~15.0 | Lưu JWT access token an toàn |
| expo-haptics | ~15.0 | Haptic feedback cho interactions |
| Reanimated | ~4.x | Animations (worklets, withSpring) |
| Moti | ^0.30 | Animation primitives |
| react-native-maps | ^1.20 | Map view + markers |
| @gorhom/bottom-sheet | ^5 | Bottom sheet modals |
| expo-location | ~18.0 | Lấy vị trí GPS thiết bị |

**Lưu ý quan trọng:** Mobile dùng **Zod v3** (không phải v4 như web).

---

## 3. Design System

### 3.1 Colors

```typescript
// constants/theme.ts
export const colors = {
  primary: "#1A3A6B",   // Navy blue — màu chính, headers, CTAs
  accent:  "#FF5733",   // Coral — booking CTA, badges
  success: "#10B981",   // Emerald — confirmed status
  warning: "#F59E0B",   // Amber — pending status
  error:   "#EF4444",   // Red — failed/cancelled status
  neutral: {
    50:  "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    500: "#64748B",
    900: "#0F172A",
  },
}
```

### 3.2 Typography

```typescript
export const fonts = {
  heading:    "PlusJakartaSans-Bold",      // Headers, titles
  subheading: "PlusJakartaSans-SemiBold",  // Section headers
  body:       "Inter-Regular",             // Body text
  bodyMedium: "Inter-Medium",              // Emphasized body
  price:      "DMSans-Bold",               // Số giá tiền
}
```

**Fonts cần load trong root `_layout.tsx`:** Plus Jakarta Sans, Inter, DM Sans.

### 3.3 Bottom Navigation

Animated pill navigation (Momo-style) với Reanimated `withSpring`:
- Guest: Explore · Search · Bookings · Messages · Notifications · Profile
- Owner: Dashboard · Properties · Reservations · Messages
- Admin: Overview · Hotels · Users · System

---

## 4. Cấu Trúc Route

```
mobile/app/
├── index.tsx                    # Entry: redirect dựa trên auth + role
├── _layout.tsx                  # Root: load fonts, QueryClient, Providers
├── +not-found.tsx
│
├── (auth)/
│   ├── welcome.tsx              # Màn hình chào mừng
│   ├── onboarding.tsx           # Giới thiệu features
│   ├── login.tsx                # Đăng nhập
│   ├── register.tsx             # Đăng ký
│   └── forgot-password.tsx      # Quên mật khẩu (UI có, backend chưa có)
│
├── (guest)/                     # Role: guest
│   ├── _layout.tsx              # Tab bar + useRealtimeConnection hook
│   ├── (home)/
│   │   ├── index.tsx            # Home: trending hotels, featured areas
│   │   ├── hotel/[id].tsx       # Chi tiết khách sạn
│   │   └── booking/
│   │       ├── [roomId].tsx     # Chọn ngày (MiniCalendar custom)
│   │       ├── review.tsx       # Review & Pay (card input)
│   │       ├── processing.tsx   # Saga processing (animated steps + polling/WS)
│   │       └── confirmation.tsx # Xác nhận thành công
│   ├── (search)/
│   │   ├── index.tsx            # Search với FilterSheet
│   │   └── map.tsx              # Map view với geo markers
│   ├── (bookings)/
│   │   ├── index.tsx            # Danh sách (All/Upcoming/Past tabs)
│   │   └── [id].tsx             # Chi tiết booking
│   ├── (messages)/
│   │   ├── index.tsx            # Conversation list
│   │   └── [conversationId].tsx # Chat room
│   ├── (notifications)/
│   │   └── index.tsx
│   └── (profile)/
│       └── index.tsx            # Profile + stats + haptic logout
│
├── (owner)/
│   ├── _layout.tsx              # Owner tab bar
│   ├── (dashboard)/
│   │   └── index.tsx            # Dashboard KPI cards
│   ├── (properties)/
│   │   ├── index.tsx            # Danh sách properties
│   │   ├── [id].tsx             # Chi tiết property
│   │   ├── create.tsx           # Tạo property mới
│   │   ├── rooms/[hotelId].tsx  # Danh sách phòng
│   │   └── inventory/[roomId].tsx
│   ├── (reservations)/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   └── (messages)/
│       ├── index.tsx
│       └── [conversationId].tsx
│
└── (admin)/
    ├── _layout.tsx
    ├── (overview)/index.tsx     # Admin overview + health banner
    ├── (hotels)/
    │   ├── index.tsx            # Approvals queue
    │   └── [id].tsx
    ├── (users)/
    │   ├── index.tsx
    │   └── [id].tsx             # Role management
    └── (system)/
        └── index.tsx            # System health monitor (UI mock)
```

---

## 5. Trạng Thái Từng Màn Hình

### 5.1 Auth

| Màn Hình | Trạng Thái | Ghi Chú |
|----------|-----------|---------|
| Welcome + Onboarding | Hoàn chỉnh | UI tốt |
| Login | Kết nối thật | `auth.service.login()` + lưu SecureStore |
| Register | Kết nối thật | |
| Forgot Password | UI có | Backend chưa có `POST /auth/forgot-password` |

### 5.2 Guest Flow

| Màn Hình | Trạng Thái | Ghi Chú |
|----------|-----------|---------|
| Home | Kết nối thật | `useTrendingHotels` → `GET /hotels` |
| Search List | Kết nối thật + fallback | `useSearchHotels` → ES search, mock fallback nếu lỗi |
| Search Map | **Cần làm** | File có, chưa kết nối `expo-location` + ES geo |
| Hotel Detail | Kết nối thật | `useHotelDetail`, `useHotelRooms` |
| Booking Calendar | Hoàn chỉnh | MiniCalendar custom, lưu vào `booking.store` |
| Booking Review | Kết nối thật | Card input, đọc từ store |
| Processing (Saga) | Polling | `GET /bookings/:id/status` — cần chuyển sang WS |
| Confirmation | Hoàn chỉnh | |
| Bookings List | Kết nối thật | Tab All/Upcoming/Past |
| Booking Detail | Kết nối thật | |
| Notifications | Kết nối thật | `GET /notifications` + mark read |
| Messages | Kết nối thật | `chatService` đầy đủ + WS |
| Profile | Một phần | Hiển thị info, chưa có update form |

### 5.3 Owner Flow

| Màn Hình | Trạng Thái | Ghi Chú |
|----------|-----------|---------|
| Owner Dashboard | Kết nối thật | `useOwnerDashboard` → `GET /owner/dashboard` |
| Properties List | Kết nối thật | |
| Create Property | Kết nối thật | |
| Rooms List | Kết nối thật | |
| Inventory | Kết nối thật | |
| Reservations | Kết nối thật | |
| Owner Messages | Kết nối thật | |

### 5.4 Admin Flow

| Màn Hình | Trạng Thái | Ghi Chú |
|----------|-----------|---------|
| Admin Overview | Kết nối thật | Health banner |
| Hotels Pending | Kết nối thật | `admin.service.getPendingHotels()` |
| Hotel Detail (admin) | Kết nối thật | approve/reject |
| Users List | Kết nối thật | |
| User Detail | Kết nối thật | Role management |
| System Health | **Mock** | Cần wire `GET /admin/system/health` |

---

## 6. Key Patterns

### 6.1 Booking Flow — State Management

`booking.store` (Zustand, không persist) truyền data giữa các màn hình:

```typescript
interface BookingDraft {
  roomId: string; hotelId: string; hotelName: string; roomName: string;
  pricePerNight: number; checkIn: string; checkOut: string; guests: number;
}
interface BookingState {
  draft: BookingDraft | null;
  currentBookingId: string | null;
  sagaStatus: BookingStatus | null;
  setDraft: (draft: BookingDraft) => void;        // dùng trực tiếp
  setSagaStatus: (status: BookingStatus) => void;
  reset: () => void;
}
```

**Luồng:**
```
hotel/[id] → chọn phòng → booking/[roomId] (calendar) → setDraft()
  → booking/review (đọc draft) → createBooking() + checkout()
  → booking/processing (watch sagaStatus)
  → sagaStatus === "confirmed" → booking/confirmation
  → reset()
```

**Quan trọng:** Dùng `useBookingStore().setDraft()` trực tiếp, không phải `startBooking()` từ `useBookingFlow`.

### 6.2 useRealtimeConnection Hook

File: `hooks/useRealtimeConnection.ts`

Hook quản lý WebSocket toàn session. Mount ở **Guest layout root** (`(guest)/_layout.tsx`).

```typescript
export function useRealtimeConnection() {
  // 1. Lấy token từ SecureStore (Bearer, không có HttpOnly cookie trên mobile)
  // 2. POST /ws/ticket với Authorization header → nhận one-time ticket
  // 3. Kết nối wss://...?ticket=xxx
  // 4. Dispatch messages:
  //    - "booking_status_updated" → setSagaStatus() nếu đúng bookingId
  //    - "notification.new"       → notificationStore.addNotification()
  //    - "chat.message"           → chatStore.prependMessage()
  //    - "chat.typing"            → chatStore.setTyping() (clear 3s)
  // 5. Exponential backoff reconnect (1s → 30s cap)
}
```

**Quan trọng:** `SecureStore` (không phải cookie) vì React Native không có HttpOnly cookie. Key: `auth_access_token`.

### 6.3 ConflictRetryModal — 409 UX

Khi 2 users đồng thời book cùng phòng → backend trả 409:

```typescript
// hooks/useConflictRetry.ts
const { executeWithRetry, showConflictModal } = useConflictRetry()

// booking/review.tsx
await executeWithRetry(async () => {
  const booking = await bookingService.create(...)
  await paymentService.checkout(booking.id)
})
// 409 → auto retry với exponential backoff (max 3 lần)
// Hết retry → showConflictModal = true → hiển thị ConflictRetryModal
```

`ConflictRetryModal` là bottom sheet giải thích tình huống và cho phép retry thủ công.

### 6.4 API Client — Auth

```typescript
// services/api.ts — Bearer token từ SecureStore
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 → POST /auth/refresh → lưu token mới → retry original request
```

### 6.5 Haptic Feedback

Tất cả interactive elements dùng `expo-haptics`:

```typescript
import * as Haptics from "expo-haptics"

// Nút bấm thường
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Action quan trọng (đặt phòng, thanh toán)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Thành công / lỗi
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
```

---

## 7. Setup Local Development

```bash
cd mobile

# Cài dependencies
npm install

# Copy env
cp .env.example .env
# Sửa EXPO_PUBLIC_API_URL và EXPO_PUBLIC_WS_URL

# Dev server
npm start        # Expo Go
npm run ios      # iOS Simulator
npm run android  # Android Emulator

# Reset cache nếu gặp vấn đề
npm run reset    # expo start -c

# Type check
npm run lint     # tsc --noEmit
```

### Environment Variables

```env
# .env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_WS_URL=ws://localhost:8080

# Thiết bị thật: thay localhost bằng IP máy tính
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080
```

---

## 8. Roadmap Tasks Còn Thiếu

### P1 — Critical

**1. WebSocket thật cho Processing Screen**
- File: `app/(guest)/(home)/booking/processing.tsx`
- Hiện: polling `GET /bookings/:id/status` mỗi 2s
- Cần: `useRealtimeConnection` đã implement — đảm bảo hook mount trước khi checkout chạy
- Processing screen watch `sagaStatus` từ `booking.store`
- **Bài học:** Saga Pattern + WebSocket real-time

**2. Map Geo Search thật**
- File: `app/(guest)/(search)/map.tsx`
- Bước 1: `expo-location` → lấy vị trí thiết bị
- Bước 2: `hotelService.search({ lat, lng, radius_km: 10 })` → ES `geo_distance`
- Bước 3: Render `Marker` trên `react-native-maps` với giá
- Bước 4: Drag map → lấy center → re-search
- **Bài học:** Elasticsearch geo-spatial search

**3. Notification Real-time Badge**
- `useRealtimeConnection` đã dispatch `notification.new` → store
- Cần: Tab bar badge đọc `unreadCount` từ `notification.store` và cập nhật real-time

### P2 — Important

**4. Admin System Health thật**
- File: `app/(admin)/(system)/index.tsx`
- Gọi `admin.service.getSystemHealth()` → `GET /admin/system/health`
- `refetchInterval: 30_000`

**5. Profile Update**
- Cần backend thêm `PUT /api/v1/auth/me` trước
- Sau đó: thêm edit form trong profile screen

**6. Booking Cancel**
- Nút "Cancel" trong `app/(guest)/(bookings)/[id].tsx`
- Confirm dialog → `bookingService.cancel(id)` → `DELETE /bookings/:id`

### P3 — Nice to Have

**7. Forgot Password flow** — Chờ backend thêm endpoint

**8. Dark Mode** — NativeWind theming

**9. E2E Tests (Maestro)** — Critical flows: auth → search → book → confirm

# WEB.md — StayEase Next.js Management Portal

> Cập nhật: 2026-04-16
> Next.js 15 (App Router) · Zustand v5 · React Query v5 · Shadcn/UI · TailwindCSS v4 · Zod v4

---

## 1. Audience & Use Case

**Quan trọng:** Web app này KHÔNG phục vụ khách đặt phòng (Guest).

| Role | Use Case |
|------|----------|
| **Hotel Owner** | Quản lý danh sách khách sạn, phòng, tồn kho — Xem đặt phòng của khách — Chat với khách — Xem dashboard doanh thu/occupancy |
| **Admin** | Duyệt/từ chối khách sạn mới — Quản lý users (role, deactivate) — Xem tất cả bookings — Giám sát system health — Quản lý Dead Letter Queue — Broadcast thông báo toàn hệ thống |

**Guest** (tìm kiếm, đặt phòng, thanh toán) **chỉ có trên Mobile app.**

---

## 2. Tech Stack

| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Next.js | 15.x (App Router) | Framework, SSR/RSC |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | v4 | Styling (CSS-first config, không có `tailwind.config.js`) |
| Shadcn/UI | latest | Component library (built on Radix UI) |
| Zustand | v5 | Global state (auth, chat, notifications) |
| TanStack Query | v5 | Server state, caching, mutations |
| React Hook Form | v7 | Form management |
| Zod | v4 | Schema validation |
| Axios | v1 | HTTP client (interceptor auto-refresh JWT) |
| Recharts | v2 | Charts cho analytics/dashboard |
| date-fns | v4 | Date utilities |
| Sonner | v2 | Toast notifications |
| next-themes | latest | Light/Dark/System toggle |
| lucide-react | latest | Icons |

### Quy Tắc Import Quan Trọng

```typescript
// Zod v4
import { z } from "zod"        // OK với zod ^4.x
import { z } from "zod/v4"     // Explicit v4 API (cũng OK)

// TailwindCSS v4: colors định nghĩa qua CSS variables trong globals.css
// KHÔNG hardcode color values, dùng CSS vars:
// var(--primary), var(--accent), ...

// Path aliases (tsconfig.json):
import { apiClient } from "@/services/api"
import { useAuthStore } from "@/stores/auth.store"
```

---

## 3. Cấu Trúc Dự Án

```
web/
├── app/
│   ├── layout.tsx              # Root layout (QueryClientProvider, Toaster, ThemeProvider)
│   ├── page.tsx                # Redirect → /login hoặc role-based dashboard
│   ├── globals.css             # Tailwind v4 + CSS variables (colors, fonts)
│   ├── (auth)/
│   │   ├── layout.tsx          # Auth layout (centered card)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (owner)/
│   │   ├── layout.tsx          # Owner sidebar layout + auth guard (role=owner)
│   │   └── owner/
│   │       ├── dashboard/page.tsx
│   │       ├── properties/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/
│   │       │       ├── page.tsx
│   │       │       └── rooms/
│   │       │           ├── page.tsx
│   │       │           └── [roomId]/inventory/page.tsx
│   │       ├── reservations/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── analytics/page.tsx
│   │       ├── messages/page.tsx
│   │       └── settings/page.tsx
│   └── (admin)/
│       ├── layout.tsx          # Admin sidebar layout + auth guard (role=admin)
│       └── admin/
│           ├── dashboard/page.tsx
│           ├── hotels/
│           │   ├── page.tsx       # Pending hotels list
│           │   └── [id]/page.tsx  # Chi tiết + approve/reject
│           ├── users/
│           │   ├── page.tsx
│           │   └── [id]/page.tsx
│           ├── bookings/page.tsx
│           ├── system/
│           │   ├── page.tsx       # System health
│           │   ├── dlq/page.tsx   # Dead Letter Queue
│           │   └── logs/page.tsx
│           ├── analytics/page.tsx
│           ├── broadcast/page.tsx
│           └── messages/page.tsx
├── components/
│   ├── ui/                     # Shadcn components
│   ├── layout/                 # Sidebar, Header, NotificationPanel
│   └── shared/                 # Reusable business components
├── hooks/
│   ├── use-auth.ts             # Auth guard + role check
│   ├── use-websocket.ts        # Low-level WebSocket hook
│   ├── use-realtime.ts         # High-level: ticket → WS → dispatch to stores
│   ├── use-data-table.ts       # TanStack Table helper
│   └── use-mobile.ts           # Media query hook
├── services/
│   ├── api.ts                  # Axios instance + 401 interceptor (withCredentials: true)
│   ├── auth.service.ts
│   ├── hotel.service.ts
│   ├── booking.service.ts
│   ├── chat.service.ts
│   ├── admin.service.ts
│   └── system.service.ts       # Health, DLQ
├── stores/
│   ├── auth.store.ts           # Zustand: user, isAuthenticated (persist localStorage)
│   ├── chat.store.ts           # Zustand: conversations, messages, typing
│   └── notification.store.ts   # Zustand: notifications, unread count
├── types/
│   ├── user.types.ts
│   ├── api.types.ts            # ApiResponse<T>, PaginatedResponse<T>
│   └── chat.types.ts
└── lib/
    └── utils.ts                # cn() helper (clsx + tailwind-merge)
```

---

## 4. Trạng Thái Từng Trang

### 4.1 Auth

| Trang | Route | Trạng Thái | Ghi Chú |
|-------|-------|-----------|---------|
| Login | `/login` | Kết nối thật | `authService.login()` |
| Register | `/register` | Kết nối thật | `authService.register()` |

### 4.2 Owner Pages

| Trang | Route | Trạng Thái | Ghi Chú |
|-------|-------|-----------|---------|
| Dashboard | `/owner/dashboard` | **MOCK** | KPI cards cứng, cần gọi `GET /owner/dashboard` |
| Properties List | `/owner/properties` | **MOCK** | `MOCK_HOTELS` override, service sẵn có |
| Create Property | `/owner/properties/new` | Kết nối thật | `hotelService.createHotel()` |
| Property Detail | `/owner/properties/[id]` | Một phần | Đọc thật, update còn mock |
| Rooms List | `/owner/properties/[id]/rooms` | Một phần | `hotelService.getRooms()` OK |
| Inventory | `/owner/.../[roomId]/inventory` | Kết nối thật | get + update inventory OK |
| Reservations | `/owner/reservations` | **MOCK** | Endpoint `owner/reservations` không tồn tại |
| Analytics | `/owner/analytics` | **MOCK** | Backend chưa có analytics endpoint |
| Messages | `/owner/messages` | Chưa wire | `chatService` đủ nhưng UI chưa kết nối |

### 4.3 Admin Pages

| Trang | Route | Trạng Thái | Ghi Chú |
|-------|-------|-----------|---------|
| Hotels Pending | `/admin/hotels` | **MOCK** | `MOCK_PENDING` override, service sẵn có |
| Hotel Detail | `/admin/hotels/[id]` | Một phần | approve/reject có service |
| Users | `/admin/users` | Kết nối thật | `adminService.getUsers()` OK |
| User Detail | `/admin/users/[id]` | Kết nối thật | get + updateRole OK |
| Bookings | `/admin/bookings` | Kết nối thật | `bookingService.getAllBookings()` OK |
| System Health | `/admin/system` | **MOCK** | `INITIAL_SERVICES` cứng |
| DLQ | `/admin/system/dlq` | **MOCK** | `MOCK_DLQ`, service sẵn có |
| Logs | `/admin/system/logs` | Không wire được | Backend không có endpoint logs |
| Broadcast | `/admin/broadcast` | Kết nối thật | `chatService.broadcast()` OK |
| Messages | `/admin/messages` | Chưa đầy đủ | UI chưa hoàn thiện |
| Analytics | `/admin/analytics` | **MOCK** | Không có backend endpoint |

---

## 5. Key Patterns

### 5.1 API Service Layer

```typescript
// services/api.ts — Axios instance với auto-refresh
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
  withCredentials: true,  // HttpOnly cookie tự động gửi kèm
})
// Interceptor: 401 → POST /auth/refresh → retry → redirect /login nếu fail

// Pattern nhất quán cho mọi service
export const hotelService = {
  getMyHotels: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Hotel>>("/owner/hotels", { params }).then(r => r.data),
  createHotel: (data: CreateHotelDto) =>
    apiClient.post<ApiResponse<Hotel>>("/owner/hotels", data).then(r => r.data),
}
```

### 5.2 React Query Usage

```typescript
// Query (read)
const { data, isLoading } = useQuery({
  queryKey: ["hotels", "pending"],
  queryFn: () => adminService.getPendingHotels(),
  refetchInterval: 30_000,  // auto-refresh cho system health
})

// Mutation (write)
const approveMutation = useMutation({
  mutationFn: (id: string) => adminService.approveHotel(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["hotels", "pending"] })
    toast.success("Khách sạn đã được duyệt")
  },
  onError: (error: AxiosError) => {
    toast.error(error.response?.data?.error ?? "Có lỗi xảy ra")
  },
})
```

### 5.3 Auth Store (Zustand v5)

```typescript
// stores/auth.store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      signOut: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "stayease-auth" }
  )
)
```

**Lưu ý:** Không lưu tokens — backend dùng HttpOnly cookie.

### 5.4 WebSocket Hooks

**`use-websocket.ts`** — Low-level primitive:
- Quản lý connection, reconnect với exponential backoff
- Expose `{ isConnected, send, disconnect }`

**`use-realtime.ts`** — High-level manager (gọi 1 lần ở layout root):
1. `POST /ws/ticket` → lấy one-time ticket
2. Kết nối `wss://.../ws/bookings?ticket=xxx`
3. Parse và dispatch messages tới stores

**Cần bổ sung thêm handlers trong `use-realtime.ts`:**
```typescript
case "booking_status_updated":
  // dispatch tới booking state
  break
case "notification.new":
  notificationStore.getState().addNotification(msg.data)
  break
```

### 5.5 Protected Routes

Mỗi role-group layout có auth guard:
- Check `isAuthenticated` từ `useAuthStore`
- Check `user.role` match với required role
- Redirect `/login` nếu chưa authenticate
- Redirect 403 nếu sai role

### 5.6 Form Validation với Zod v4

```typescript
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const schema = z.object({
  name: z.string().min(3, "Tên tối thiểu 3 ký tự"),
  price_per_night: z.number().positive("Giá phải dương"),
})

const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
```

---

## 6. Roadmap Kết Nối Backend (Theo Thứ Tự Ưu Tiên)

### P1 — Xóa Mock Data

**1. Owner Dashboard thật**
- File: `app/(owner)/owner/dashboard/page.tsx`
- Gọi `GET /api/v1/owner/dashboard`
- Hiển thị KPI: total rooms, occupancy rate, revenue, recent bookings

**2. Owner Properties List thật**
- File: `app/(owner)/owner/properties/page.tsx`
- Xóa `MOCK_HOTELS` override
- Để `useQuery(() => hotelService.getMyHotels())` chạy thật

**3. Admin Hotels Pending thật**
- File: `app/(admin)/admin/hotels/page.tsx`
- Xóa `MOCK_PENDING`
- Wire `adminService.getPendingHotels()` + approve/reject mutations

**4. Admin System Health thật**
- File: `app/(admin)/admin/system/page.tsx`
- Xóa `INITIAL_SERVICES`
- Wire `systemService.getHealth()` với `refetchInterval: 30_000`

**5. Admin DLQ thật**
- File: `app/(admin)/admin/system/dlq/page.tsx`
- Xóa `MOCK_DLQ`
- Wire `systemService.getDLQ()` + retry mutation

### P2 — Real-time Features

**6. WebSocket đầy đủ**
- Mở rộng `use-realtime.ts`: thêm `booking_status_updated`, `notification.new`
- Badge "Live" trong header khi WS connected

**7. Notifications panel thật**
- Fetch `GET /notifications` khi mount
- Mark read khi click
- Badge count từ `GET /notifications/unread-count`

### P3 — Owner Features

**8. Owner Reservations** — Cần `GET /owner/bookings` từ backend (endpoint chưa tồn tại)

**9. Owner Messages/Chat** — Wire `chatService.listConversations()` + real-time messages

**10. Owner Analytics** — Phụ thuộc backend thêm `GET /owner/analytics`

---

## 7. Conventions

### CSS Variables (Tailwind v4)

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #1A3A6B;
  --color-accent: #FF5733;
  /* ... */
}
```

KHÔNG hardcode màu trong className.

### Server vs Client Components

- Page files mặc định là Server Component
- Thêm `"use client"` khi dùng: `useState`, `useEffect`, hooks, event handlers
- Stores và React Query hooks chỉ trong Client Components

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/v1/ws/bookings
```

### Commands

```bash
cd web
npm run dev      # Dev server (port 3001)
npm run build    # Production build
npm run lint     # ESLint + TypeScript check
```

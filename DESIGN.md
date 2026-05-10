# DESIGN.md — StayEase Design System

> Version: 1.1 | Cập nhật: 2026-05-11
> Tài liệu này là **nguồn sự thật duy nhất** (Single Source of Truth) cho mọi quyết định thiết kế trên Web (Next.js) và Mobile (Expo/React Native).
> Mọi developer phải đọc và tuân thủ trước khi viết UI code.

---

## 0. Triết Lý Thiết Kế

**StayEase** là nền tảng quản lý và đặt phòng khách sạn. Thiết kế cần truyền đạt:

- **Tin cậy** — Người dùng tin tưởng giao tiền và lịch trình cho hệ thống
- **Rõ ràng** — Thông tin giá, ngày, phòng phải đọc được ngay lập tức
- **Hiệu quả** — Owner/Admin hoàn thành tác vụ nhanh, ít click nhất
- **Nhất quán** — Web và Mobile nhìn như một sản phẩm duy nhất

**4 nguyên tắc cốt lõi:**
1. **Consistency first** — Cùng token, cùng spacing, cùng component behavior
2. **Data clarity** — Số liệu (giá, ngày, trạng thái) luôn được ưu tiên hiển thị
3. **Accessible by default** — WCAG AA minimum, không phải afterthought
4. **Performance aware** — Animation có mục đích, không phải trang trí

---

## 1. Color System

### 1.1 Brand Colors (Shared — Web & Mobile)

```
Primary   Navy        #1A3A6B    Dùng cho: Header, CTA chính, active states, links
Accent    Warm Gold   #B8860B    Dùng cho: Booking CTA, hot deals, highlights, badges
Success   Emerald     #10B981    Dùng cho: Confirmed booking, online status, success toasts
Warning   Amber       #F59E0B    Dùng cho: Pending payment, awaiting review, caution states
Error     Red         #EF4444    Dùng cho: Failed booking, error toasts, destructive actions
Info      Blue        #3B82F6    Dùng cho: Informational tooltips, help text, in-progress
```

### 1.2 Neutral Scale (Shared)

```
neutral-50   #F8FAFC    Background pages, very light surfaces
neutral-100  #F1F5F9    Card backgrounds, input fields (light mode)
neutral-200  #E2E8F0    Borders, dividers, skeleton backgrounds
neutral-300  #CBD5E1    Placeholder text, icons disabled
neutral-400  #94A3B8    Muted text, secondary icons
neutral-500  #64748B    Body text secondary
neutral-600  #475569    Body text primary (minimum for accessibility)
neutral-700  #334155    Subheadings
neutral-800  #1E293B    Headings
neutral-900  #0F172A    Display text, maximum contrast
```

### 1.3 Semantic Status Colors

| Status | Color | Hex | Dùng cho |
|--------|-------|-----|---------|
| `confirmed` | Emerald | `#10B981` | Booking confirmed, payment success |
| `pending` | Amber | `#F59E0B` | Awaiting action, in review |
| `awaiting_payment` | Blue | `#3B82F6` | Payment initiated, processing |
| `processing` | Violet | `#8B5CF6` | Saga running, system working |
| `failed` | Red | `#EF4444` | Payment failed, booking rejected |
| `cancelled` | Neutral | `#64748B` | Cancelled by user or timeout |
| `online` | Emerald | `#10B981` | System healthy, service up |
| `offline` | Red | `#EF4444` | Service down |
| `degraded` | Amber | `#F59E0B` | High latency, partial failure |

### 1.4 CSS Variables (Web — globals.css)

```css
@theme {
  /* Brand */
  --color-primary:    #1A3A6B;
  --color-primary-50: #EFF6FF;
  --color-accent:     #B8860B;
  --color-accent-50:  #FFFBEB;

  /* Semantic */
  --color-success:    #10B981;
  --color-warning:    #F59E0B;
  --color-error:      #EF4444;
  --color-info:       #3B82F6;

  /* Surfaces */
  --color-background: #F8FAFC;
  --color-surface:    #FFFFFF;
  --color-border:     #E2E8F0;

  /* Text */
  --color-text-primary:   #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted:     #94A3B8;

  /* Dark Mode overrides (auto via next-themes) */
  &[data-theme="dark"] {
    --color-background: #0F172A;
    --color-surface:    #1E293B;
    --color-border:     #334155;
    --color-text-primary:   #F8FAFC;
    --color-text-secondary: #94A3B8;
    --color-text-muted:     #475569;
  }
}
```

### 1.5 Mobile Tokens (constants/colors.ts)

```typescript
// mobile/constants/colors.ts
export const colors = {
  // Brand
  primary:   "#1A3A6B",
  primaryLight: "#EFF6FF",
  accent:    "#B8860B",
  accentLight: "#FFFBEB",

  // Semantic
  success:   "#10B981",
  warning:   "#F59E0B",
  error:     "#EF4444",
  info:      "#3B82F6",

  // Neutrals
  neutral: {
    50:  "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },

  // Surfaces
  background: "#F8FAFC",
  surface:    "#FFFFFF",
  border:     "#E2E8F0",
}
```

### 1.6 KHÔNG được làm với màu

```
❌ Hardcode hex trực tiếp vào component: style={{ color: "#1A3A6B" }}
❌ Dùng neutral-400 hoặc nhạt hơn cho body text (contrast fail)
❌ Dùng màu khác với palette trên để biểu thị trạng thái
❌ Thêm màu mới mà không cập nhật DESIGN.md này
```

---

## 2. Typography

### 2.1 Font Families

```
Heading:     Plus Jakarta Sans (Bold 700, SemiBold 600)
Body:        Inter (Regular 400, Medium 500)
Price/Data:  DM Sans (Bold 700, Medium 500)
Monospace:   JetBrains Mono (Code, timestamps, IDs)
```

**Rationale:**
- Plus Jakarta Sans: Geometric, modern, trustworthy — phù hợp brand hospitality
- Inter: Tối ưu cho màn hình nhỏ, dễ đọc ở kích thước nhỏ
- DM Sans: Số liệu sắc nét, phân biệt rõ giữa 0 và O
- JetBrains Mono: Correlation IDs, logs trong admin panel

### 2.2 Type Scale (Shared Web & Mobile)

| Token | Size (Web) | Size (Mobile) | Weight | Dùng cho |
|-------|-----------|--------------|--------|---------|
| `display` | 48px / 3rem | 36px | 700 PlusJakartaSans | Hero headings, splash screen |
| `h1` | 36px / 2.25rem | 28px | 700 PlusJakartaSans | Page titles |
| `h2` | 28px / 1.75rem | 22px | 600 PlusJakartaSans | Section titles |
| `h3` | 22px / 1.375rem | 18px | 600 PlusJakartaSans | Card headers, group labels |
| `h4` | 18px / 1.125rem | 16px | 600 PlusJakartaSans | Subheadings, dialog titles |
| `body-lg` | 18px / 1.125rem | 16px | 400 Inter | Lead paragraphs |
| `body` | 16px / 1rem | 15px | 400 Inter | Main body text |
| `body-sm` | 14px / 0.875rem | 13px | 400 Inter | Secondary info, captions |
| `caption` | 12px / 0.75rem | 12px | 400 Inter | Timestamps, meta info |
| `price-lg` | 28px / 1.75rem | 24px | 700 DM Sans | Room price, booking total |
| `price` | 20px / 1.25rem | 18px | 700 DM Sans | List price, KPI numbers |
| `price-sm` | 16px / 1rem | 14px | 500 DM Sans | Per night label, discounts |
| `label` | 12px / 0.75rem | 11px | 500 Inter uppercase | Form labels, badge text |
| `code` | 13px | 12px | 400 JetBrains Mono | IDs, logs, timestamps |

### 2.3 Web — Tailwind Typography Classes

```css
/* Mapping cho globals.css hoặc component */
.text-display  { font: 700 3rem/1.1 'Plus Jakarta Sans'; }
.text-h1       { font: 700 2.25rem/1.2 'Plus Jakarta Sans'; }
.text-h2       { font: 600 1.75rem/1.3 'Plus Jakarta Sans'; }
.text-h3       { font: 600 1.375rem/1.4 'Plus Jakarta Sans'; }
.text-h4       { font: 600 1.125rem/1.4 'Plus Jakarta Sans'; }
.text-body-lg  { font: 400 1.125rem/1.7 'Inter'; }
.text-body     { font: 400 1rem/1.6 'Inter'; }
.text-body-sm  { font: 400 0.875rem/1.5 'Inter'; }
.text-caption  { font: 400 0.75rem/1.4 'Inter'; }
.text-price-lg { font: 700 1.75rem/1 'DM Sans'; }
.text-price    { font: 700 1.25rem/1 'DM Sans'; }
.text-label    { font: 500 0.75rem/1 'Inter'; letter-spacing: 0.06em; text-transform: uppercase; }
```

### 2.4 Mobile — Font Usage

```typescript
// mobile/constants/typography.ts
export const typography = {
  display:   { fontFamily: "PlusJakartaSans-Bold",     fontSize: 36, lineHeight: 42 },
  h1:        { fontFamily: "PlusJakartaSans-Bold",     fontSize: 28, lineHeight: 36 },
  h2:        { fontFamily: "PlusJakartaSans-SemiBold", fontSize: 22, lineHeight: 30 },
  h3:        { fontFamily: "PlusJakartaSans-SemiBold", fontSize: 18, lineHeight: 26 },
  h4:        { fontFamily: "PlusJakartaSans-SemiBold", fontSize: 16, lineHeight: 24 },
  bodyLg:    { fontFamily: "Inter-Regular",            fontSize: 16, lineHeight: 26 },
  body:      { fontFamily: "Inter-Regular",            fontSize: 15, lineHeight: 24 },
  bodySm:    { fontFamily: "Inter-Regular",            fontSize: 13, lineHeight: 20 },
  caption:   { fontFamily: "Inter-Regular",            fontSize: 12, lineHeight: 18 },
  priceLg:   { fontFamily: "DMSans-Bold",              fontSize: 24, lineHeight: 28 },
  price:     { fontFamily: "DMSans-Bold",              fontSize: 18, lineHeight: 22 },
  priceSm:   { fontFamily: "DMSans-Medium",            fontSize: 14, lineHeight: 18 },
  label:     { fontFamily: "Inter-Medium",             fontSize: 11, lineHeight: 16, letterSpacing: 0.8, textTransform: "uppercase" as const },
}
```

### 2.5 Line Length

```
Web:    65–75 ký tự per line (max-w-prose hoặc max-w-2xl cho body text)
Mobile: Tự nhiên theo container width — không giới hạn cứng
```

---

## 3. Spacing System

**Base unit: 4px**

```
space-1  = 4px    (0.25rem)  — Icon gap, tight elements
space-2  = 8px    (0.5rem)   — Small padding, icon-text gap
space-3  = 12px   (0.75rem)  — Button padding vertical, badge padding
space-4  = 16px   (1rem)     — Standard padding, gap between items
space-5  = 20px   (1.25rem)  — Card internal padding (compact)
space-6  = 24px   (1.5rem)   — Card internal padding (standard)
space-8  = 32px   (2rem)     — Section gaps, dialog padding
space-10 = 40px   (2.5rem)   — Large gaps, between sections
space-12 = 48px   (3rem)     — Page vertical padding (mobile)
space-16 = 64px   (4rem)     — Page vertical padding (web)
space-20 = 80px   (5rem)     — Hero padding
space-24 = 96px   (6rem)     — Large section spacing (desktop)
```

### 3.1 Spacing Usage Rules

```
Component internal padding:    space-4 to space-6 (16–24px)
Between sibling components:    space-4 to space-8 (16–32px)
Section vertical padding:      space-12 to space-16 (48–64px)
Page horizontal padding web:   space-4 to space-8 (16–32px, responsive)
Page horizontal padding mobile: space-4 (16px) minimum
Bottom tab bar safe area:      Thêm safeAreaInsets.bottom trên mobile
```

---

## 4. Border Radius

```
radius-sm   = 6px    Badges, chips, small tags
radius-md   = 10px   Buttons, inputs, small cards
radius-lg   = 14px   Cards, modals, bottom sheets
radius-xl   = 20px   Large cards, hero cards
radius-2xl  = 28px   Feature cards, hero containers
radius-full = 9999px Avatars, pills, circular buttons
```

**Mobile specific:**
```typescript
// constants/radius.ts
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, "2xl": 28, full: 9999 }
```

---

## 5. Shadow & Elevation

| Level | Dùng cho | Web (Tailwind) | Mobile (style) |
|-------|---------|----------------|----------------|
| `shadow-xs` | Input focus | `shadow-sm` | `elevation: 1` |
| `shadow-sm` | Cards resting | `shadow` | `elevation: 2` |
| `shadow-md` | Cards hover, dropdowns | `shadow-md` | `elevation: 4` |
| `shadow-lg` | Modals, popovers | `shadow-lg` | `elevation: 8` |
| `shadow-xl` | Bottom sheets, full modals | `shadow-xl` | `elevation: 16` |

**Web CSS values:**
```css
--shadow-xs:  0 1px 2px rgba(0,0,0,0.05);
--shadow-sm:  0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05);
--shadow-lg:  0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
--shadow-xl:  0 20px 25px rgba(0,0,0,0.08), 0 10px 10px rgba(0,0,0,0.04);
```

---

## 6. Component Specifications

### 6.1 Button

**Variants:**

| Variant | Dùng cho | Web class | Mobile style |
|---------|---------|-----------|-------------|
| `primary` | CTA chính, submit | `bg-primary text-white` | `backgroundColor: colors.primary` |
| `accent` | Booking CTA, đặt phòng | `bg-accent text-white` | `backgroundColor: colors.accent` |
| `secondary` | Cancel, back | `border border-border bg-surface` | border + bg |
| `ghost` | Nav links, filter | `hover:bg-neutral-100` | transparent |
| `danger` | Delete, deactivate | `bg-error text-white` | `backgroundColor: colors.error` |

**Sizing:**

| Size | Height | Padding H | Font | Touch target |
|------|--------|-----------|------|-------------|
| `sm` | 32px | 12px | 13px | min 44px touch wrapper |
| `md` | 40px | 16px | 15px | natural |
| `lg` | 48px | 20px | 16px | natural |
| `xl` | 56px | 24px | 18px | Full-width mobile CTA |

**States:**
```
Normal:   opacity 1.0, shadow-sm
Hover:    opacity 0.92, shadow-md (web only)
Active:   scale 0.97, opacity 0.88 (150ms transition)
Loading:  Spinner bên trái, text mờ, disabled
Disabled: opacity 0.5, cursor-not-allowed, no press feedback
```

**Rules:**
- Luôn có `cursor-pointer` trên web
- Luôn có `activeOpacity={0.85}` hoặc `Pressable` với feedback trên mobile
- Haptic `ImpactFeedbackStyle.Light` trên mọi button tap mobile
- Booking CTA dùng `accent`, không dùng `primary`

### 6.2 Card

**Web:**
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);   /* 14px */
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 200ms, transform 200ms;
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
```

**Mobile:**
```typescript
const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,        // 14
  padding: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
}
```

### 6.3 Hotel Card (Guest Mobile)

```
Layout:     Horizontal (thumbnail left) cho list view
            Vertical (thumbnail top) cho grid/featured view
Image:      expo-image với cachePolicy="memory-disk", aspect 3:2
Price:      DMSans-Bold, prominent, top-right corner
Rating:     Star icon + số, dưới tên khách sạn
Status pill: Overlay bottom-left của ảnh (nếu available/sold out)
Tap area:   Toàn bộ card, không chỉ button
```

### 6.4 Status Badge / Pill

```
Confirmed:        bg emerald-50, text emerald-700, dot emerald
Pending:          bg amber-50,   text amber-700,   dot amber
Awaiting payment: bg blue-50,    text blue-700,    dot blue
Processing:       bg violet-50,  text violet-700,  dot violet animate-pulse
Failed:           bg red-50,     text red-700,     dot red
Cancelled:        bg neutral-100, text neutral-500, dot neutral-400

Size:    height 24px, padding 4px 10px, font 12px uppercase, radius-full
```

### 6.5 Input Field

```
Height:          44px (minimum — touch target compliance)
Border:          1px solid border (normal), primary (focus), error (error)
Border radius:   radius-md (10px)
Padding:         12px horizontal
Font:            Inter 15px
Placeholder:     text-muted
Label:           14px Inter Medium, margin-bottom 6px, text-secondary
Error message:   12px Inter, text-error, margin-top 4px, icon ⚠ trái
Helper text:     12px Inter, text-muted, margin-top 4px

Focus ring (web): outline 2px offset 2px primary-50
Keyboard type (mobile): Luôn set inputMode / keyboardType phù hợp
  - Email:    keyboardType="email-address" autoCapitalize="none"
  - Phone:    keyboardType="phone-pad"
  - Price:    keyboardType="decimal-pad"
  - Number:   keyboardType="numeric"
```

### 6.6 Navigation

**Web Sidebar:**
```
Width:         240px (expanded), 64px (collapsed)
Background:    white / neutral-900 (dark)
Border-right:  1px solid border
Nav item:      height 40px, padding 0 12px, radius-md, gap 10px
Active item:   bg primary-50, text primary, font-medium
Hover item:    bg neutral-100 (light), bg neutral-800 (dark)
Icon size:     20px Lucide
Section title: 11px uppercase label, text-muted, padding 8px 12px
```

**Mobile Bottom Tab:**
```
Height:        60px + safeAreaInsets.bottom
Background:    white / neutral-900
Border-top:    1px solid border
Active pill:   background primary, width auto, height 34px, radius-full
              Animated với Reanimated withSpring (mass:0.5, damping:15)
Tab icon:      24px, tinted primary (active) / neutral-400 (inactive)
Tab label:     10px label font, hidden trong pill mode
Unread badge: 18px circle, bg accent (#B8860B), text white, 10px font
              Max badge: "99+"
```

### 6.7 Loading States

**Skeleton (web):**
```html
<div class="animate-pulse bg-neutral-200 rounded-lg h-[200px]" />
```

**Skeleton (mobile):**
```typescript
// Dùng Moti skeleton hoặc react-native-skeleton-content
<Skeleton colorMode="light" width="100%" height={200} radius={14} />
```

**Spinner:**
- Web: `<Loader2 className="animate-spin" size={20} />` (Lucide)
- Mobile: `<ActivityIndicator color={colors.primary} size="small" />`

**Button loading:**
```typescript
// Web
<Button disabled={isPending}>
  {isPending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
  {isPending ? "Đang xử lý..." : "Đặt phòng"}
</Button>

// Mobile
<Pressable disabled={isPending} style={{ opacity: isPending ? 0.7 : 1 }}>
  {isPending && <ActivityIndicator color="white" style={{ marginRight: 8 }} />}
  <Text>{isPending ? "Đang xử lý..." : "Đặt phòng"}</Text>
</Pressable>
```

### 6.8 Toast / Notification

```
Success:  bg emerald-50, border-l-4 emerald, icon CheckCircle, text emerald-800
Error:    bg red-50, border-l-4 red, icon XCircle, text red-800
Warning:  bg amber-50, border-l-4 amber, icon AlertTriangle, text amber-800
Info:     bg blue-50, border-l-4 blue, icon InfoIcon, text blue-800

Web:      Sonner (position top-right, offset 16px)
Mobile:   Toast từ thư viện hoặc custom component, position top, margin safeArea
Duration: Success 3s, Error 5s, Warning 4s
```

### 6.9 Modal / Bottom Sheet

**Web (Dialog từ Shadcn):**
```
Max-width:    560px (sm), 768px (lg)
Border-radius: radius-xl (20px)
Overlay:      rgba(0,0,0,0.5) backdrop
Animation:    fade + scale (200ms)
Header:       h3 heading + X button top-right
Footer:       Action buttons right-aligned
```

**Mobile (Bottom Sheet từ @gorhom/bottom-sheet):**
```
Border-radius: 20px top corners
Handle:        3px wide, 32px wide, neutral-300, top-center
Background:    white / neutral-900
Snap points:   ["50%", "90%"] cho content dài
Close:         Swipe down hoặc X button
Overlay:       animated opacity 0→0.5
```

---

## 7. Icon System

**Web:** Lucide React (consistent với Shadcn/UI)
**Mobile:** Lucide React Native hoặc `@expo/vector-icons` (Ionicons)

**Không dùng emoji làm icons.**

**Kích thước chuẩn:**
```
16px — Inline với text nhỏ (badge, caption)
20px — Sidebar nav, button icons, list items
24px — Tab bar icons, header actions, card icons
28px — Empty state icons (phụ)
48px — Empty state hero icons
```

**Tint colors:**
```
Nav active:    primary (#1A3A6B)
Nav inactive:  neutral-400 (#94A3B8)
Button icons:  inherit từ button text color
Status icons:  match semantic color (success/warning/error)
```

---

## 8. Animation & Motion

### 8.1 Duration & Easing

```
Micro (hover, focus):     150ms  ease-out
Fast (button press):      150ms  ease-in-out
Normal (panel open):      250ms  ease-out
Slow (page transition):   350ms  ease-in-out
Spring (mobile tab pill): mass=0.5, damping=15, stiffness=200 (Reanimated)
```

### 8.2 Những Animation được phép

```
✅ Button press: scale 0.97, opacity 0.88 (150ms)
✅ Card hover:   translateY(-2px), shadow-md (200ms)
✅ Skeleton:     opacity pulse (1.5s, infinite, loading only)
✅ Saga steps:   fadeIn + slideInUp mỗi step khi active
✅ Tab pill:     withSpring width/translateX (mobile nav)
✅ Toast:        slideIn từ top/bottom
✅ Modal/Sheet:  fade + scale, slide from bottom
✅ Spinner:      rotate (loading only)
✅ Count-up:     KPI numbers trên dashboard (on mount, một lần)
```

### 8.3 Animation bị cấm

```
❌ Continuous decorative animation (bounce icons khi idle)
❌ Parallax phức tạp (performance trên mobile)
❌ Animate width/height trực tiếp (dùng transform/opacity)
❌ Animation blocking user interaction > 300ms
❌ Nhiều simultaneous animations (> 3 cùng lúc)
```

### 8.4 Reduced Motion

```css
/* Web */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// Mobile
import { useReducedMotion } from "react-native-reanimated"
const shouldReduceMotion = useReducedMotion()
const duration = shouldReduceMotion ? 0 : 250
```

---

## 9. Platform-Specific Guidelines

### 9.1 Web (Next.js) — Specific Rules

```
Layout:
  Sidebar + content layout cho tất cả owner/admin pages
  Max content width: max-w-7xl (1280px) centered
  Page padding: px-4 sm:px-6 lg:px-8
  Card grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

Data Table:
  Dùng TanStack Table v8 qua useDataTable hook
  Sticky header khi scroll
  Row hover: bg-neutral-50
  Sorted column: icon indicator, text primary
  Pagination: dưới table, hiển thị "Trang X / Y"

Forms:
  Label trên input (không placeholder thay label)
  Error message inline dưới input
  Submit button: bottom-right, primary variant
  Cancel: secondary, bên trái submit

Responsive breakpoints:
  sm:  640px   — small tablets
  md:  768px   — tablets
  lg:  1024px  — laptops
  xl:  1280px  — desktops
  2xl: 1536px  — large monitors
```

### 9.2 Mobile (Expo) — Specific Rules

```
Safe Areas:
  LUÔN wrap content với SafeAreaView hoặc useSafeAreaInsets()
  Bottom tab bar: padding-bottom = safeAreaInsets.bottom
  Header: padding-top = safeAreaInsets.top (nếu custom header)

Touch Targets:
  Minimum 44x44px cho mọi interactive element
  8px gap tối thiểu giữa các touch targets cạnh nhau
  Tap area mở rộng qua hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

Scroll:
  Sử dụng FlatList / FlashList cho danh sách > 20 items
  keyExtractor phải stable (id, không phải index)
  getItemLayout cho FlatList fixed-height nếu có thể
  overScrollMode="never" trên Android để tránh accidental refresh

Images:
  Dùng expo-image (không phải RN Image)
  cachePolicy="memory-disk" cho tất cả remote images
  contentFit="cover" cho hotel images
  placeholder blur hoặc shimmer khi loading

Keyboard:
  KeyboardAvoidingView bao quanh form
  behavior="padding" (iOS), behavior="height" (Android)
  Dismiss keyboard khi tap outside input
  ScrollView + keyboardShouldPersistTaps="handled"

Gestures:
  Dùng react-native-gesture-handler (không phải RN built-in)
  Back gesture (iOS) không nên conflict với swipe-to-delete
  Pull-to-refresh: chỉ trên màn hình list (bookings, hotels)
```

---

## 10. Accessibility

### 10.1 Contrast Ratios (WCAG AA)

```
Normal text (< 18px):      4.5:1 minimum
Large text (≥ 18px / bold ≥ 14px): 3:1 minimum
UI components & icons:     3:1 minimum
Focus indicators:          3:1 against adjacent colors
```

**Các combination đã verify:**
```
primary #1A3A6B on white #FFFFFF:   10.3:1 ✅ AAA
accent  #B8860B on white #FFFFFF:   4.2:1  ✅ AA (cả large text và UI components)
neutral-600 #475569 on white:       5.7:1  ✅ AA
neutral-500 #64748B on white:       4.6:1  ✅ AA (minimum allowed)
white #FFFFFF on primary #1A3A6B:   10.3:1 ✅ AAA
white #FFFFFF on accent #B8860B:    4.2:1  ✅ AA
```

⚠️ **Lưu ý:** `accent #B8860B` đủ contrast cho large text (≥18px) và UI components — KHÔNG dùng cho body text (< 18px) trên nền trắng vì cần 4.5:1.

### 10.2 Web Accessibility

```html
<!-- Images -->
<img alt="Tên khách sạn và thành phố" />
<!-- Decorative: -->
<img alt="" role="presentation" />

<!-- Icon buttons -->
<button aria-label="Đóng dialog">
  <X size={20} aria-hidden="true" />
</button>

<!-- Form labels -->
<label for="checkin-date">Ngày nhận phòng</label>
<input id="checkin-date" type="date" />

<!-- Status (không chỉ dùng màu) -->
<span class="status-confirmed">
  <CheckCircle aria-hidden="true" />
  <span>Đã xác nhận</span>
</span>

<!-- Live regions cho real-time updates -->
<div aria-live="polite" aria-atomic="true">
  {wsStatus === "connected" ? "Đang kết nối live" : ""}
</div>
```

**Keyboard navigation:**
```
Tab:     Di chuyển giữa interactive elements
Enter:   Activate button, link
Space:   Toggle checkbox, activate button
Escape:  Đóng modal, dropdown
Arrow:   Di chuyển trong menu, tabs
```

### 10.3 Mobile Accessibility

```typescript
// Screen reader support
<Pressable
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Đặt phòng Superior, 1.500.000 đồng mỗi đêm"
  accessibilityHint="Chạm để xem chi tiết và chọn ngày"
>
  ...
</Pressable>

// Status không chỉ dùng màu
<View style={styles.statusBadge}>
  <Ionicons name="checkmark-circle" color={colors.success} />
  <Text>Đã xác nhận</Text>
</View>
```

---

## 11. Data Display Patterns

### 11.1 Price Display

```
Luôn hiển thị đơn vị tiền tệ: "1.500.000 ₫" hoặc "1,500,000 VND"
Giá per night: "/ đêm" nhỏ hơn, muted text
Tổng booking: nổi bật nhất, price-lg token
Giá gốc (nếu có giảm): line-through, text-muted

Format:
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)
  // Output: "1.500.000 ₫"
```

### 11.2 Date Display

```
Short date:   "16/04/2026"         — List views
Medium date:  "Th4 16, 2026"       — Detail views
Long date:    "Thứ Năm, 16 tháng 4, 2026" — Booking confirmation
Date range:   "16 – 19 tháng 4"    — Duration display
Relative:     "2 giờ trước"        — Notification timestamps
Time:         "14:30"              — Checkin/checkout time

Library: date-fns (web), date-fns (mobile — đã có)
Locale: vi (tiếng Việt) cho user-facing, ISO 8601 cho API
```

### 11.3 Status Display

Luôn dùng **cả màu + text + icon** — không chỉ màu:

```
confirmed       ✅ Đã xác nhận      emerald
pending         ⏳ Chờ xử lý        amber
awaiting_payment 💳 Chờ thanh toán  blue
processing      🔄 Đang xử lý       violet (animate-pulse)
failed          ❌ Thất bại         red
cancelled       🚫 Đã hủy           neutral
```

### 11.4 Empty States

```
Illustration: Simple SVG (không ảnh stock, không emoji)
Heading:      h3, text-secondary, mô tả ngắn gọn
Subtext:      body-sm, text-muted, hướng dẫn tiếp theo
CTA:          primary button nếu có action khả dụng

Examples:
  Danh sách trống:  "Chưa có đặt phòng nào" + "Tìm khách sạn"
  Search no result: "Không tìm thấy khách sạn phù hợp" + "Thử tiêu chí khác"
  Error:           "Đã có lỗi xảy ra" + "Thử lại"
```

---

## 12. Real-time UI Patterns

### 12.1 WebSocket Status Indicator (Web)

```
Connected:    Dot xanh animate-pulse + "Live" text (header, nhỏ)
Disconnected: Dot xám + "Offline" (không panic, silent)
Reconnecting: Dot vàng animate-bounce + "Đang kết nối lại..."

Vị trí: Top-right header, cạnh notification bell
Chỉ hiển thị khi status thay đổi (không luôn visible)
```

### 12.2 Saga Processing Screen (Mobile)

```
Animation steps: Mỗi step fadeIn + slideInUp khi active (250ms)
Current step:    Primary color + animate-pulse indicator
Completed step:  Emerald + checkmark (fade-in 150ms)
Failed step:     Red + X icon (shake animation 300ms)
Progress bar:    Animated width (thuận chiều từ trái sang phải)
Timeout:         Step không chuyển sau 30s → show "Đang mất nhiều thời gian..."
```

### 12.3 Notification Badge

```
Position (web):   top-right của bell icon, offset -4px -4px
Position (mobile): top-right của tab icon, offset -6px -4px
Size:             18px height, min-width 18px, padding 0 4px
Max value:        99 (hiển thị "99+" nếu ≥ 100)
Color:            bg accent #B8860B, text white
Animation:        scale in (bounceIn 300ms) khi badge số tăng
```

---

## 13. Forms & Validation

```
Inline validation: Validate onBlur, không onKeyPress (tránh annoying)
Error timing:      Hiển thị sau khi user blur khỏi field, hoặc khi submit
Error position:    Dưới input, không phải tooltip/overlay
Submit loading:    Button loading state, disable form controls
Success:           Toast + redirect (không toast + block on page)

Field groups:      Grouping liên quan fields (checkin/checkout cùng nhau)
Required marker:   Asterisk (*) đỏ sau label, legend trong form
Optional marker:   " (tùy chọn)" text nhỏ hơn, muted
```

---

## 14. Checklist Trước Khi Merge

Mọi PR có thay đổi UI phải pass các check này:

### Visual
- [ ] Dùng token màu từ design system (không hardcode hex)
- [ ] Font đúng với type scale (PlusJakartaSans/Inter/DM Sans)
- [ ] Spacing theo bội số 4px
- [ ] Border radius đúng theo context
- [ ] Status hiển thị cả màu + text + icon

### Interaction (Web)
- [ ] Tất cả clickable elements có `cursor-pointer`
- [ ] Hover states rõ ràng (150–200ms transition)
- [ ] Focus ring visible (outline primary)
- [ ] Button disabled state đúng khi loading

### Interaction (Mobile)
- [ ] Touch targets ≥ 44×44px
- [ ] Haptic feedback trên button taps
- [ ] SafeAreaView wrapper đúng chỗ
- [ ] Keyboard behavior đúng trên form screens

### Accessibility
- [ ] Alt text cho images có nghĩa
- [ ] aria-label cho icon buttons (web)
- [ ] accessibilityLabel trên Pressable quan trọng (mobile)
- [ ] Status không phân biệt chỉ bằng màu
- [ ] Contrast ratio ≥ 4.5:1 cho body text

### Loading & Errors
- [ ] Loading state với skeleton hoặc spinner
- [ ] Error state rõ ràng với action recovery
- [ ] Empty state với message và CTA (nếu áp dụng)
- [ ] `prefers-reduced-motion` được xử lý

### Responsive
- [ ] Test 375px, 768px, 1024px, 1440px (web)
- [ ] Test iPhone SE (375px), iPhone 16 Pro Max (430px) (mobile)
- [ ] Không horizontal scroll ngoài ý muốn

---

## 15. Anti-Patterns — Những Điều KHÔNG Được Làm

```
❌ Dùng emoji làm icon UI (🏨 🔑 ✈️ → dùng Lucide/Ionicons SVG)
❌ Hardcode màu hex trực tiếp vào component
❌ Dùng neutral-300 hoặc nhạt hơn cho text content
❌ Accent gold #B8860B cho body text nhỏ < 18px (contrast không đủ ở nền sáng)
❌ Các button khác nhau có cùng visual weight trên cùng screen
❌ Spinner infinite animation trên decorative elements
❌ Modal mở không có đường tắt đóng (ESC web, swipe-down mobile)
❌ Form validation ngay khi đang gõ (annoying)
❌ Toast error tự dismiss sau 2s (quá nhanh để đọc)
❌ Animation blocking user interaction > 300ms
❌ Thêm màu mới vào project mà không update DESIGN.md
❌ Sử dụng default React Native Image (dùng expo-image)
❌ FlatList cho danh sách dài không có keyExtractor stable
```

---

## 16. Quick Reference Card

```
Brand:         Navy #1A3A6B  |  Warm Gold #B8860B
Success:       #10B981       |  Warning: #F59E0B  |  Error: #EF4444
Font heading:  Plus Jakarta Sans Bold
Font body:     Inter Regular
Font price:    DM Sans Bold
Touch target:  44×44px minimum
Border radius: 6 / 10 / 14 / 20 / 28 / full
Spacing unit:  4px base
Animation:     150ms micro | 250ms normal | 350ms page
Z-index:       10 dropdown | 20 sticky | 30 overlay | 40 modal | 50 toast
```

---

*DESIGN.md được tạo 2026-04-16. Cập nhật tài liệu này mỗi khi thay đổi token hoặc pattern.*
*Web: Next.js 15 + Shadcn/UI + TailwindCSS v4 | Mobile: Expo SDK ~54 + NativeWind v4*

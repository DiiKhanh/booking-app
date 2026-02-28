export interface RevenueDataPoint {
  label: string;
  revenue: number;
  bookings: number;
}

export interface OccupancyDataPoint {
  date: string;
  rate: number;
  roomId?: string;
}

export interface OwnerAnalytics {
  totalRevenue: number;
  revenueTrend: number;
  occupancyRate: number;
  occupancyTrend: number;
  totalBookings: number;
  bookingsTrend: number;
  totalRooms: number;
  availableRooms: number;
  revenueChart: RevenueDataPoint[];
  occupancyChart: OccupancyDataPoint[];
  recentActivity: ActivityEvent[];
}

export interface ActivityEvent {
  id: string;
  type:
    | "booking_new"
    | "booking_cancelled"
    | "check_in"
    | "check_out"
    | "review"
    | "payment";
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  guestName?: string;
}

export interface AdminAnalytics {
  activeUsers: number;
  activeUsersTrend: number;
  totalHotels: number;
  pendingHotels: number;
  todayTransactions: number;
  todayRevenue: number;
  systemLoad: number;
}

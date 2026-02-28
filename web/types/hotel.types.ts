export type HotelStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  starRating: number;
  status: HotelStatus;
  ownerId: string;
  photos: string[];
  amenities: string[];
  totalRooms: number;
  availableRooms: number;
  averagePrice: number;
  occupancyRate: number;
  totalRevenue: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type RoomType = "standard" | "deluxe" | "suite" | "penthouse";

export interface Room {
  id: string;
  hotelId: string;
  name: string;
  type: RoomType;
  description: string;
  capacity: number;
  bedType: string;
  size: number;
  basePrice: number;
  photos: string[];
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InventoryStatus = "available" | "limited" | "sold_out" | "blocked";

export interface InventoryDay {
  date: string;
  roomId: string;
  available: number;
  total: number;
  price: number;
  status: InventoryStatus;
}

export interface CreateHotelDto {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  starRating: number;
  amenities: string[];
}

export interface UpdateHotelDto extends Partial<CreateHotelDto> {}

export interface CreateRoomDto {
  name: string;
  type: RoomType;
  description: string;
  capacity: number;
  bedType: string;
  size: number;
  basePrice: number;
  amenities: string[];
}

export interface UpdateRoomDto extends Partial<CreateRoomDto> {
  isActive?: boolean;
}

export interface UpdateInventoryDto {
  date: string;
  available: number;
  price?: number;
  status?: InventoryStatus;
}

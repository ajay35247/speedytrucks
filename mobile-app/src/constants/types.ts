export type UserRole = 'DRIVER' | 'SHIPPER' | 'ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  token: string;
  refreshToken?: string;
};

export type DashboardMetrics = Record<string, number>;

export type LoadItem = {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  pickupCity: string;
  dropCity: string;
  materialType: string;
  weightTons: number;
  quotedPrice: number | string;
  status: string;
};

export type TripItem = {
  id: string;
  vehicleNumber: string;
  currentStatus: string;
  etaHours?: number | null;
  currentLat?: number | null;
  currentLng?: number | null;
  load?: {
    id: string;
    pickupCity: string;
    dropCity: string;
    materialType: string;
  };
};

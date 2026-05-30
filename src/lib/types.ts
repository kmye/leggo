export type TripStatus = "planning" | "active" | "completed";
export type MemberRole = "owner" | "editor" | "viewer";
export type StopCategory = "food" | "sightseeing" | "hotel" | "transport" | "shopping" | "other";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  status: TripStatus;
  cover_image_url: string | null;
  share_token: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripWithDays extends Trip {
  trip_days: DayWithStops[];
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: MemberRole;
  invited_at: string;
}

export interface TripDay {
  id: string;
  trip_id: string;
  date: string | null;
  day_number: number;
  notes: string;
}

export interface DayWithStops extends TripDay {
  stops: StopWithPhotos[];
}

export interface Stop {
  id: string;
  day_id: string;
  order_index: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  category: StopCategory;
  time_start: string | null;
  time_end: string | null;
  notes: string;
  estimated_budget: number | null;
  currency: string;
  links: StopLink[];
  booking_references: BookingReference[];
  custom_fields: CustomField[];
  created_at: string;
}

export interface StopWithPhotos extends Stop {
  stop_photos: StopPhoto[];
}

export interface StopLink {
  label: string;
  url: string;
}

export interface BookingReference {
  provider: string;
  ref: string;
  url: string;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface StopPhoto {
  id: string;
  stop_id: string;
  storage_path: string;
  caption: string | null;
  order_index: number;
  uploaded_at: string;
}

export type InviteStatus = "pending" | "accepted" | "revoked";

export interface TripInvite {
  id: string;
  trip_id: string;
  inviter_id: string;
  role: MemberRole;
  token: string;
  status: InviteStatus;
  accepted_by: string | null;
  created_at: string;
  expires_at: string;
}

export interface TripMemberWithUser extends TripMember {
  users: Pick<User, "id" | "name" | "avatar_url" | "email">;
}

export interface PresenceMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  current_stop_id: string | null;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating: number | null;
  photo_url: string | null;
  types: string[];
  opening_hours?: { open_now: boolean };
}

export interface PlaceDetails extends PlaceResult {
  website: string | null;
  phone: string | null;
}

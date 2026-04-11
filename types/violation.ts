export interface Violation {
  id: string;
  track_id: string | null;
  vehicle_number: string | null;
  detected_at: string | null;
  location: string | null;
  helmet_status: string | null;
  date_folder: string | null;
  status: string;
  reason: string | null;
  created_at: string | null;
  challan: boolean;

  // New unified URL columns (may contain base64 string OR https:// URL)
  complete_image_url: string | null;
  plate_image_url: string | null;
}
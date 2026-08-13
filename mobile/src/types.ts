export interface Studio {
  id: string;
  name: string;
  branch?: string | null;
  website?: string | null;
  instagram?: string | null;
  address?: string | null;
  photo_url?: string | null;
  maps_url?: string | null;
}

export interface Instructor {
  id: number;
  name: string;
  display_name?: string | null;
  bio?: string | null;
  instagram?: string | null;
  photo_url?: string | null;
  reel_urls?: string[] | null;
}

// instrs is keyed by both instructor.name and instructor.id (see useAppData)
export type InstructorMap = Record<string | number, Instructor>;

export interface ParsedTime {
  hour: number;
  minute: number;
}

// A row from classes_display, plus the fields useAppData computes on top.
export interface ClassRow {
  id: number;
  scrape_run_id: number;
  studio_id: string;
  studioId: string;
  instructor_id: number | null;
  instructor: string | null;
  date: string; // YYYY-MM-DD
  class_name: string;
  name: string;
  genre: string | null;
  time_range: string | null;
  venue: string | null;
  last_updated: string | null;
  parsedTime: ParsedTime | null;
}

export interface AppData {
  studios: Studio[];
  instrs: InstructorMap;
  classes: ClassRow[];
  lastUpdated: string | null;
}

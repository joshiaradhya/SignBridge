import { supabase } from "@/integrations/supabase/client";

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  language: string;
  summary: string;
  source: string;
  order_index: number;
};

export type Sign = {
  id: string;
  lesson_id: string;
  slug: string;
  gloss: string;
  meaning: string;
  handshape: string;
  location: string;
  movement: string;
  expression: string;
  common_mistake: string;
  steps: string[];
  image_key: string;
  order_index: number;
};

export const lessonsQuery = {
  queryKey: ["lessons"],
  queryFn: async (): Promise<Lesson[]> => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("order_index");
    if (error) throw error;
    return (data ?? []) as Lesson[];
  },
};

export const signsQuery = {
  queryKey: ["signs"],
  queryFn: async (): Promise<Sign[]> => {
    const { data, error } = await supabase
      .from("signs")
      .select("*")
      .order("order_index");
    if (error) throw error;
    return (data ?? []) as Sign[];
  },
};

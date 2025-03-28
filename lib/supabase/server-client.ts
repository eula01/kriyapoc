import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "./types";

export function getServerSupabase() {
  return createRouteHandlerClient<Database>({ cookies });
}

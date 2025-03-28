import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { Database } from "./types";

export const createServerClient = cache(() => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
});

// Server action helpers
export async function getAccountsServer() {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching accounts:", error);
    throw new Error("Failed to fetch accounts");
  }

  return data;
}

export async function getAccountByIdServer(id: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching account:", error);
    throw new Error("Failed to fetch account");
  }

  return data;
} 
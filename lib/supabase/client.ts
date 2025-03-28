"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "./types";

export const supabase = createClientComponentClient<Database>();

// Server-side only utility functions
export async function getAccounts() {
  console.log(`📊 [Database] Fetching all accounts`);
  
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("name");

  if (error) {
    console.error(`❌ [Database] Error fetching accounts:`, error);
    throw new Error("Failed to fetch accounts");
  }

  console.log(`✅ [Database] Successfully fetched ${data?.length || 0} accounts`);
  return data;
}

export async function getAccountById(id: string) {
  console.log(`📊 [Database] Fetching account with ID: ${id}`);
  
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`❌ [Database] Error fetching account with ID ${id}:`, error);
    throw new Error("Failed to fetch account");
  }

  console.log(`✅ [Database] Successfully fetched account: ${data?.name}`);
  return data;
}

export async function createAccount(account: Database["public"]["Tables"]["accounts"]["Insert"]) {
  console.log(`📊 [Database] Creating new account: ${account.name}`);
  console.log(`📊 [Database] Account data:`, {
    name: account.name,
    website: account.website,
    b2borb2c: account.b2borb2c,
    is_online_checkout_present: account.is_online_checkout_present,
    ecomm_provider: account.ecomm_provider,
    psp_or_card_processor: account.psp_or_card_processor
  });
  
  const { data, error } = await supabase
    .from("accounts")
    .insert(account)
    .select("*")
    .single();

  if (error) {
    console.error(`❌ [Database] Error creating account:`, error);
    throw new Error("Failed to create account");
  }

  console.log(`✅ [Database] Successfully created account with ID: ${data.id}`);
  return data;
}

export async function updateAccount(id: string, account: Database["public"]["Tables"]["accounts"]["Update"]) {
  console.log(`📊 [Database] Updating account with ID: ${id}`);
  console.log(`📊 [Database] Updated fields:`, account);
  
  const { data, error } = await supabase
    .from("accounts")
    .update(account)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error(`❌ [Database] Error updating account with ID ${id}:`, error);
    throw new Error("Failed to update account");
  }

  console.log(`✅ [Database] Successfully updated account: ${data.name}`);
  return data;
}

export async function deleteAccount(id: string) {
  console.log(`📊 [Database] Deleting account with ID: ${id}`);
  
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`❌ [Database] Error deleting account with ID ${id}:`, error);
    throw new Error("Failed to delete account");
  }

  console.log(`✅ [Database] Successfully deleted account with ID: ${id}`);
  return true;
} 
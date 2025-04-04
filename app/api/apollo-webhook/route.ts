import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: Request) {
  try {
    console.log(`📲 [Apollo Webhook] Received webhook callback from Apollo`);
    
    // Parse the webhook payload
    const webhookData = await request.json();
    console.log(`📲 [Apollo Webhook] Payload: ${JSON.stringify(webhookData, null, 2)}`);
    
    // Validate required fields
    if (!webhookData.id) {
      console.error(`❌ [Apollo Webhook] Missing person ID in webhook data`);
      return Response.json(
        { error: "Missing person ID in webhook data" },
        { status: 400 }
      );
    }
    
    // Extract person ID from the webhook payload
    const personId = webhookData.id;
    
    // Get URL parameters to identify the person type and domain
    const url = new URL(request.url);
    const personType = url.searchParams.get('person_type');
    const domain = url.searchParams.get('domain');
    
    if (!personType || !domain) {
      console.error(`❌ [Apollo Webhook] Missing person_type or domain in webhook URL: ${request.url}`);
      return Response.json(
        { error: "Missing person_type or domain in webhook URL" },
        { status: 400 }
      );
    }
    
    // Extract phone numbers from the webhook data
    const phoneNumbers = webhookData.phone_numbers || [];
    const bestPhoneNumber = phoneNumbers.length > 0 ? phoneNumbers[0].number : null;
    
    // Log the extracted data
    console.log(`📲 [Apollo Webhook] Person ID: ${personId}`);
    console.log(`📲 [Apollo Webhook] Person Type: ${personType}`);
    console.log(`📲 [Apollo Webhook] Domain: ${domain}`);
    console.log(`📲 [Apollo Webhook] Best phone number: ${bestPhoneNumber}`);
    
    if (!bestPhoneNumber) {
      console.log(`⚠️ [Apollo Webhook] No phone numbers returned from Apollo`);
      return Response.json({
        success: false,
        message: "No phone numbers in webhook data"
      });
    }
    
    // Find the company with the matching domain
    const { data: companyData, error: companyError } = await supabase
      .from("company_analyses")
      .select("*")
      .eq("domain", domain)
      .limit(1);
      
    if (companyError || !companyData || companyData.length === 0) {
      console.error(`❌ [Apollo Webhook] No company found with domain: ${domain}`);
      return Response.json(
        { error: `No company found with domain: ${domain}` },
        { status: 404 }
      );
    }
    
    const company = companyData[0];
    console.log(`📲 [Apollo Webhook] Found company: ${company.name}`);
    
    // Update the phone number based on person type (CEO or CFO)
    if (personType.toUpperCase() === 'CEO') {
      const { error: updateError } = await supabase
        .from("company_analyses")
        .update({
          ceo_phone: bestPhoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq("id", company.id);
        
      if (updateError) {
        console.error(`❌ [Apollo Webhook] Error updating CEO phone number:`, updateError);
        return Response.json(
          { error: "Failed to update CEO phone number" },
          { status: 500 }
        );
      }
        
      console.log(`✅ [Apollo Webhook] Updated CEO phone number for ${company.name}`);
    } 
    else if (personType.toUpperCase() === 'CFO') {
      const { error: updateError } = await supabase
        .from("company_analyses")
        .update({
          cfo_phone: bestPhoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq("id", company.id);
        
      if (updateError) {
        console.error(`❌ [Apollo Webhook] Error updating CFO phone number:`, updateError);
        return Response.json(
          { error: "Failed to update CFO phone number" },
          { status: 500 }
        );
      }
        
      console.log(`✅ [Apollo Webhook] Updated CFO phone number for ${company.name}`);
    }
    else {
      console.error(`❌ [Apollo Webhook] Invalid person type: ${personType}`);
      return Response.json(
        { error: `Invalid person type: ${personType}` },
        { status: 400 }
      );
    }
    
    // Revalidate any paths that might display company data
    revalidatePath("/");
    
    return Response.json({ 
      success: true,
      message: `Updated ${personType} phone number for ${company.name}`
    });
  } catch (error) {
    console.error(`❌ [Apollo Webhook] Error processing webhook:`, error);
    
    return Response.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
} 
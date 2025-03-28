"use client";

// Define the structure for the analyzed website data
export interface WebsiteAnalysis {
  short_description: string;
  products_and_services: string[];
  business_model: "B2B" | "B2C" | "Both" | "unknown";
  has_online_checkout: "Yes" | "No" | "unknown";
  ecommerce_platform: string;
  payment_service_provider: string;
  salesChannelsAnalysis?: string;
}

// Modified function to use the API endpoint instead of direct calls
export async function analyzeWebsite(
  website: string,
  accountId?: string
): Promise<WebsiteAnalysis> {
  console.log(
    `🔄 [Website Analysis] Starting analysis for: ${website} via API endpoint`
  );

  // Maximum number of retries for the entire analysis process
  const MAX_RETRIES = 2;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Call our server-side API endpoint instead of direct API calls
      console.log(`🔄 [Website Analysis] Attempt ${attempt}/${MAX_RETRIES}: Sending request to API endpoint`);
      const response = await fetch("/api/analyze-website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ website, accountId }),
      });

      // Parse the JSON response regardless of status to get any error message
      const data = await response.json();
      
      if (!response.ok) {
        // Check if this is a content extraction failure (422 status)
        if (response.status === 422) {
          console.warn(
            `⚠️ [Website Analysis] Content extraction issue on attempt ${attempt}:`,
            data.error
          );
          
          if (attempt < MAX_RETRIES) {
            // Wait before retrying
            const backoffMs = 3000 * attempt;
            console.log(`⏱️ [Website Analysis] Waiting ${backoffMs}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue; // Try again
          }
        } else {
          // Other API errors
          console.error(
            `❌ [Website Analysis] API error ${response.status}:`,
            data.error
          );
          throw new Error(`API error: ${response.status}`);
        }
      }

      console.log(
        `✅ [Website Analysis] Received successful response from API endpoint`,
        data
      );

      // Return the analysis data with salesChannelsAnalysis from the API response
      return {
        ...data.analysis,
        salesChannelsAnalysis: data.salesChannelsAnalysis || ""
      };
    } catch (error) {
      console.error(
        `❌ [Website Analysis] Error in analysis process for ${website} (attempt ${attempt}/${MAX_RETRIES}):`,
        error
      );
      
      if (attempt < MAX_RETRIES) {
        // Wait before retrying
        const backoffMs = 3000 * attempt;
        console.log(`⏱️ [Website Analysis] Waiting ${backoffMs}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        // We've exhausted all retries, return default values
        return {
          short_description: "Website could not be analyzed after multiple attempts",
          products_and_services: ["unknown"],
          business_model: "unknown",
          has_online_checkout: "unknown",
          ecommerce_platform: "unknown",
          payment_service_provider: "unknown",
        };
      }
    }
  }
  
  // This point should only be reached if all attempts failed but no exception was thrown
  return {
    short_description: "Website analysis failed",
    products_and_services: ["unknown"],
    business_model: "unknown",
    has_online_checkout: "unknown",
    ecommerce_platform: "unknown",
    payment_service_provider: "unknown",
    salesChannelsAnalysis: "",
  };
}

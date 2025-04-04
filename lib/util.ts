import { BuiltWithData, BuiltWithPath, BuiltWithResponse, BuiltWithTechnology } from "@/app/api/apollo/route";

// Simplified function to fetch and process BuiltWith data
export async function fetchBuiltWithData(
    domain: string
  ): Promise<BuiltWithData> {
    console.log(
      `🔍 [BuiltWith API] Starting tech stack analysis for domain: ${domain}`
    );
  
    try {
      // BuiltWith API endpoint with API key
      const apiKey =
        process.env.NEXT_PUBLIC_BUILTWITH_API_KEY ||
        "7a8265f2-cdeb-41e7-8830-39e888762322";
      const url = `https://api.builtwith.com/v21/api.json?KEY=${apiKey}&LOOKUP=${domain}`;
  
      console.log(`🔍 [BuiltWith API] Fetching tech stack data for ${domain}`);
      const response = await fetch(url);
  
      if (!response.ok) {
        console.error(`❌ [BuiltWith API] API error: ${response.status}`);
        return { ecomm_provider: null, psp_or_card_processor: null };
      }
  
      const data = (await response.json()) as BuiltWithResponse;
  
      // Check for valid response structure
      if (!data?.Results?.[0]?.Result?.Paths) {
        console.error(`❌ [BuiltWith API] Invalid or empty response structure`);
        return { ecomm_provider: null, psp_or_card_processor: null };
      }
  
      // Extract all technologies from all paths
      const allTechnologies: BuiltWithTechnology[] = [];
      data.Results[0].Result.Paths.forEach((path: BuiltWithPath) => {
        if (path.Technologies?.length) {
          allTechnologies.push(...path.Technologies);
        }
      });
  
      console.log(
        `✅ [BuiltWith API] Found ${allTechnologies.length} technologies`
      );
  
      // Helper function to filter technologies by category
      const getTechsByCategory = (categories: string[]): string[] => {
        return allTechnologies
          .filter((tech) =>
            tech.Categories?.some((category: string) => categories.includes(category))
          )
          .map((tech) => tech.Name);
      };
  
      // Get eCommerce platforms and payment processors
      const ecommPlatforms = getTechsByCategory(["eCommerce", "Shopify App"]);
      const paymentProcessors = getTechsByCategory([
        "Payments Processor",
        "Pay Later",
      ]);
  
      console.log(
        `✅ [BuiltWith API] Found ${ecommPlatforms.length} eCommerce platforms and ${paymentProcessors.length} payment processors`
      );
  
      return {
        ecomm_provider: ecommPlatforms.length ? ecommPlatforms.join(", ") : null,
        psp_or_card_processor: paymentProcessors.length
          ? paymentProcessors.join(", ")
          : null,
      };
    } catch (error) {
      console.error(`❌ [BuiltWith API] Error fetching tech stack data:`, error);
      return {
        ecomm_provider: null,
        psp_or_card_processor: null,
      };
    }
  }
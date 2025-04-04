import { fetchCompanyByCRN } from "@/lib/actions/companieshouse";
import { WebsiteAnalysis } from "../analyze-website/route";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export interface CompanyAnalysisOutput extends WebsiteAnalysis {
  name: string;
  logo: string;
  domain: string;
  apollo_id: string;
  linkedin_url: string;
  sales_channels: string;

  // from websiteanalysis
  short_description: string; //
  products_and_services: string[]; //
  business_model: "B2B" | "B2C" | "Both" | "unknown"; //
  has_online_checkout: "Yes" | "No" | "unknown"; //
  ecommerce_platform: string | null; //
  payment_service_provider: string | null; //

  // Key people information
  key_people: {
    ceo: {
      name: string | null;
      email: string | null;
      phone: string | null;
      linkedin: string | null;
    };
    cfo: {
      name: string | null;
      email: string | null;
      phone: string | null;
      linkedin: string | null;
    };
  };
}

// Function to normalize domain for comparison
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .split("/")[0];
}

// Helper function for Apollo API searches
async function searchApollo(companyName: string) {
  console.log(`👻👻👻 [Apollo API] Searching for company name: ${companyName}`);

  try {
    // Apollo.io API endpoint for company search
    const url = "https://api.apollo.io/api/v1/mixed_companies/search";

    // Set up request payload
    const payload = {
      q_organization_name: companyName,
      per_page: 10,
      page: 1,
    };

    // Make API request to Apollo.io
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": process.env.NEXT_PUBLIC_APOLLO_API_KEY || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      `👻👻👻👻 [Apollo API] Data: ${JSON.stringify(data, null, 2).slice(
        0,
        100
      )}`
    );
    return { success: true, data };
  } catch (error) {
    console.error(`❌ [Apollo API] Error searching for company:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Add this function at the top of your file near other helper functions
async function fetchAndEnrichKeyPersons(domain: string) {
  console.log(
    `🔍 [Apollo API] Searching and enriching key persons for domain: ${domain}`
  );

  try {
    // List of executive titles to search for
    const executiveTitles = [
      // CEO titles
      "CEO",
      "Chief Executive Officer",
      "Founder",
      "Co-Founder",
      // CFO titles
      "CFO",
      "Chief Financial Officer",
    ];

    // Apollo API request to search for executives
    const response = await fetch(
      "https://api.apollo.io/api/v1/mixed_people/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": process.env.NEXT_PUBLIC_APOLLO_API_KEY || "",
        },
        body: JSON.stringify({
          q_organization_domains_list: [domain],
          person_titles: executiveTitles,
          person_seniorities: ["owner", "founder", "c_suite"],
          per_page: 5,
          page: 1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`🔍🔍🔍 [Apollo API] people search data:
      
      INPUT\n
      ${JSON.stringify(
        {
          q_organization_domains_list: [domain],
          person_titles: executiveTitles,
          person_seniorities: ["owner", "founder", "c_suite"],
          per_page: 5,
          page: 1,
        },
        null,
        2
      )}

      \n\n==============\n\n
      
      OUTPUT\n
      ${JSON.stringify(data, null, 2).slice(0, 100)}`);
    const peopleArray = [...(data.people || []), ...(data.contacts || [])];

    if (peopleArray.length === 0) {
      console.log(`⚠️ [Apollo API] No people found for domain: ${domain}`);
      return {
        ceo: { name: null, email: null, phone: null, linkedin: null },
        cfo: { name: null, email: null, phone: null, linkedin: null },
      };
    }

    // Patterns to identify CEO and CFO titles
    const ceoPatterns = [
      /ceo/i,
      /chief\s+executive/i,
      /founder/i,
      /co-founder/i,
    ];
    const cfoPatterns = [/cfo/i, /chief\s+financial/i];

    // Find CEO
    const ceo = peopleArray.find(
      (person: any) =>
        person.title &&
        ceoPatterns.some((pattern) => pattern.test(person.title))
    );

    // Find CFO (excluding the CEO if already found)
    const cfo = peopleArray.find(
      (person: any) =>
        person.title &&
        cfoPatterns.some((pattern) => pattern.test(person.title)) &&
        (!ceo || person.id !== ceo.id)
    );

    // Only use a specific CEO match, don't default to first person
    const ceoData = ceo ? ceo : null;

    // Use second person as CFO if no specific CFO found (and we have a CEO)
    const cfoData = cfo ? cfo : null;

    // Set up a webhook URL for receiving phone number data
    // This should be a stable endpoint that can receive callbacks from Apollo
    const baseWebhookUrl = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : `http://localhost:3000`;

    // Enrich CEO data if available
    let enrichedCeo = { name: null, email: null, phone: null, linkedin: null };
    if (ceoData) {
      console.log(
        `✅ [Apollo API] Found CEO candidate: ${ceoData.first_name} ${
          ceoData.last_name
        } (${ceoData.title || "No title"})`
      );

      try {
        if (ceoData.id) {
          // Include query parameters for person type and domain
          const ceoWebhookUrl = `${baseWebhookUrl}/api/apollo-webhook?person_type=CEO&domain=${encodeURIComponent(domain)}`;
          console.log(
            `🔍 [Apollo API] Enriching CEO data for ID: ${ceoData.id} with webhook URL: ${ceoWebhookUrl}`
          );
          
          const enrichResponse = await fetch(
            "https://api.apollo.io/api/v1/people/match",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-API-KEY": process.env.NEXT_PUBLIC_APOLLO_API_KEY || "",
              },
              body: JSON.stringify({
                id: ceoData.id,
                reveal_personal_emails: true,
                // reveal_phone_number: true,
                webhook_url: ceoWebhookUrl,
              }),
            }
          );

          const enrichData = await enrichResponse.json();

          console.log(
            `🔍🔍🔍🔍🔍🔍🔍 [Apollo API] Enrichment data: ${JSON.stringify(
              enrichData,
              null,
              2
            )}`
          );
          if (enrichData.person) {
            console.log(`✅ [Apollo API] Successfully enriched CEO data`);
            
            enrichedCeo = {
              name:
                ceoData.name || `${ceoData.first_name} ${ceoData.last_name}`,
              email: enrichData.person.email || null,
              phone:
                enrichData.person.phone ||
                enrichData.person.sanitized_phone ||
                null,
              linkedin:
                enrichData.person.linkedin_url || ceoData.linkedin_url || null,
            };
          }
        } else {
          enrichedCeo = {
            name: ceoData.name || `${ceoData.first_name} ${ceoData.last_name}`,
            email: ceoData.email || null,
            phone: ceoData.sanitized_phone || ceoData.phone || null,
            linkedin: ceoData.linkedin_url || null,
          };
        }
      } catch (error) {
        console.error(`❌ [Apollo API] Error enriching CEO data:`, error);
        // Use basic data if enrichment fails
        enrichedCeo = {
          name: ceoData.name || `${ceoData.first_name} ${ceoData.last_name}`,
          email: ceoData.email || null,
          phone: ceoData.sanitized_phone || ceoData.phone || null,
          linkedin: ceoData.linkedin_url || null,
        };
      }
    }

    // Enrich CFO data if available
    let enrichedCfo = { name: null, email: null, phone: null, linkedin: null };
    if (cfoData) {
      console.log(
        `✅ [Apollo API] Found CFO candidate: ${cfoData.first_name} ${
          cfoData.last_name
        } (${cfoData.title || "No title"})`
      );

      try {
        if (cfoData.id) {
          // Include query parameters for person type and domain
          const cfoWebhookUrl = `${baseWebhookUrl}/api/apollo-webhook?person_type=CFO&domain=${encodeURIComponent(domain)}`;
          console.log(
            `🔍 [Apollo API] Enriching CFO data for ID: ${cfoData.id} with webhook URL: ${cfoWebhookUrl}`
          );
          
          const enrichResponse = await fetch(
            "https://api.apollo.io/api/v1/people/match",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-API-KEY": process.env.NEXT_PUBLIC_APOLLO_API_KEY || "",
              },
              body: JSON.stringify({
                id: cfoData.id,
                reveal_personal_emails: true,
                // reveal_phone_number: true,
                webhook_url: cfoWebhookUrl,
              }),
            }
          );

          const enrichData = await enrichResponse.json();
          console.log(
            `🔍🔍🔍🔍🔍🔍🔍 [Apollo API] Enrichment data: ${JSON.stringify(
              enrichData,
              null,
              2
            )}`
          );

          if (enrichData.person) {
            console.log(`✅ [Apollo API] Successfully enriched CFO data`);
            
            enrichedCfo = {
              name:
                cfoData.name || `${cfoData.first_name} ${cfoData.last_name}`,
              email: enrichData.person.email || null,
              phone:
                enrichData.person.phone ||
                enrichData.person.sanitized_phone ||
                null,
              linkedin:
                enrichData.person.linkedin_url || cfoData.linkedin_url || null,
            };
          }
        } else {
          enrichedCfo = {
            name: cfoData.name || `${cfoData.first_name} ${cfoData.last_name}`,
            email: cfoData.email || null,
            phone: cfoData.sanitized_phone || cfoData.phone || null,
            linkedin: cfoData.linkedin_url || null,
          };
        }
      } catch (error) {
        console.error(`❌ [Apollo API] Error enriching CFO data:`, error);
        // Use basic data if enrichment fails
        enrichedCfo = {
          name: cfoData.name || `${cfoData.first_name} ${cfoData.last_name}`,
          email: cfoData.email || null,
          phone: cfoData.sanitized_phone || cfoData.phone || null,
          linkedin: cfoData.linkedin_url || null,
        };
      }
    }

    return {
      ceo: enrichedCeo,
      cfo: enrichedCfo,
    };
  } catch (error) {
    console.error(`❌ [Apollo API] Error in fetchAndEnrichKeyPersons:`, error);
    return {
      ceo: { name: null, email: null, phone: null, linkedin: null },
      cfo: { name: null, email: null, phone: null, linkedin: null },
    };
  }
}

// Save company data to the database
async function saveCompanyAnalysisToDatabase(
  companyData: CompanyAnalysisOutput
) {
  try {
    console.log(
      `💾 [Database] Saving company analysis for: ${companyData.name}`
    );

    // First check if the company exists by domain or apollo_id
    let existingCompany = null;
    
    // Try to find by apollo_id first if available
    if (companyData.apollo_id) {
      const { data } = await supabase
        .from("company_analyses")
        .select("id")
        .eq('apollo_id', companyData.apollo_id)
        .maybeSingle();
      
      if (data) existingCompany = data;
    }
    
    // If not found and domain is available, try by domain
    if (!existingCompany && companyData.domain) {
      const { data } = await supabase
        .from("company_analyses")
        .select("id")
        .eq('domain', companyData.domain)
        .maybeSingle();
      
      if (data) existingCompany = data;
    }

    let result;
    
    if (existingCompany) {
      // Update existing company
      result = await supabase
        .from("company_analyses")
        .update({
          name: companyData.name,
          logo: companyData.logo,
          domain: companyData.domain,
          apollo_id: companyData.apollo_id,
          linkedin_url: companyData.linkedin_url,
          sales_channels: companyData.sales_channels,

          // Website analysis data
          short_description: companyData.short_description,
          products_and_services: companyData.products_and_services,
          business_model: companyData.business_model,
          has_online_checkout: companyData.has_online_checkout,
          ecommerce_platform: companyData.ecommerce_platform,
          payment_service_provider: companyData.payment_service_provider,

          // Key people - CEO
          ceo_name: companyData.key_people.ceo.name,
          ceo_email: companyData.key_people.ceo.email,
          ceo_phone: companyData.key_people.ceo.phone,
          ceo_linkedin: companyData.key_people.ceo.linkedin,

          // Key people - CFO
          cfo_name: companyData.key_people.cfo.name,
          cfo_email: companyData.key_people.cfo.email,
          cfo_phone: companyData.key_people.cfo.phone,
          cfo_linkedin: companyData.key_people.cfo.linkedin,

          // Update timestamp
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCompany.id);
    } else {
      // Insert new company
      result = await supabase
        .from("company_analyses")
        .insert({
          name: companyData.name,
          logo: companyData.logo,
          domain: companyData.domain,
          apollo_id: companyData.apollo_id,
          linkedin_url: companyData.linkedin_url,
          sales_channels: companyData.sales_channels,

          // Website analysis data
          short_description: companyData.short_description,
          products_and_services: companyData.products_and_services,
          business_model: companyData.business_model,
          has_online_checkout: companyData.has_online_checkout,
          ecommerce_platform: companyData.ecommerce_platform,
          payment_service_provider: companyData.payment_service_provider,

          // Key people - CEO
          ceo_name: companyData.key_people.ceo.name,
          ceo_email: companyData.key_people.ceo.email,
          ceo_phone: companyData.key_people.ceo.phone,
          ceo_linkedin: companyData.key_people.ceo.linkedin,

          // Key people - CFO
          cfo_name: companyData.key_people.cfo.name,
          cfo_email: companyData.key_people.cfo.email,
          cfo_phone: companyData.key_people.cfo.phone,
          cfo_linkedin: companyData.key_people.cfo.linkedin,

          // Update timestamp
          updated_at: new Date().toISOString(),
        });
    }

    if (result.error) {
      console.error(`❌ [Database] Error saving company data:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(
      `✅ [Database] Successfully saved company data for: ${companyData.name}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `❌ [Database] Error in saveCompanyAnalysisToDatabase:`,
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown database error occurred",
    };
  }
}

// Handler for Apollo API POST requests
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    // THIS IS EITHER A CRN OR A URL (e.g. tesco.com)
    const { companyIdentifier } = body;

    // Check if the identifier is a CRN (starts with 3 numbers) or a company name
    const isCRN = /^\d{3}/.test(companyIdentifier);

    let companyName;
    const originalIdentifier = companyIdentifier;

    if (isCRN) {
      console.log(
        `👻👻👻 [API] Processing request for CRN: ${companyIdentifier}`
      );

      // Step 1: Get company name from Companies House using the CRN
      const companyHouseResult = await fetchCompanyByCRN(companyIdentifier);
      companyName = companyHouseResult.companyName;
      if (!companyHouseResult.companyName) {
        return Response.json(
          {
            success: false,
            error:
              companyHouseResult.error ||
              `Company not found with CRN: ${companyIdentifier}`,
          },
          { status: 404 }
        );
      }

      console.log(
        `👻👻👻👻 [API] COMPANIES HOUSE NAME FOUND OUTPUT: ${companyHouseResult.companyName}`
      );
    } else {
      companyName = companyIdentifier;
    }

    // at this points its either a company name, or a website
    const searchResult = await searchApollo(companyName);

    // Handle the search result
    if (!searchResult.success) {
      return Response.json(
        {
          success: false,
          error: searchResult.error || "Failed to search for company",
        },
        { status: 500 }
      );
    }

    // Find the matching organization
    const data = searchResult.data;
    let selectedOrg = data.organizations[0]; // Default to first organization

    // If originalIdentifier might be a domain, try to find a matching organization
    if (!isCRN && data.organizations.length > 1) {
      const normalizedSearchDomain = normalizeDomain(originalIdentifier);

      // Try to find an organization with matching domain
      const matchingOrg = data.organizations.find((org: any) => {
        const orgDomain = org.primary_domain || "";
        const orgWebsite = org.website_url || "";

        return (
          normalizeDomain(orgDomain) === normalizedSearchDomain ||
          normalizeDomain(orgWebsite) === normalizedSearchDomain
        );
      });

      if (matchingOrg) {
        console.log(
          `👻👻👻 [API] Found matching organization: ${matchingOrg.name}`
        );
        selectedOrg = matchingOrg;
      } else {
        console.log(
          `👻👻👻 [API] No matching organization found, using first result`
        );
      }
    }

    // Extract the basic fields from the selected organization
    let companyData: CompanyAnalysisOutput = {
      name: selectedOrg.name || "",
      logo: selectedOrg.logo_url || "",
      domain: selectedOrg.primary_domain || "",
      short_description: "", // Not available in the response
      apollo_id: selectedOrg.id || "",
      linkedin_url: selectedOrg.linkedin_url || "",

      // Initialize other required fields with default values
      products_and_services: [],
      business_model: "unknown",
      sales_channels: "",
      has_online_checkout: "unknown",
      ecommerce_platform: null,
      payment_service_provider: null,
      key_people: {
        ceo: {
          name: null,
          email: null,
          phone: null,
          linkedin: null,
        },
        cfo: {
          name: null,
          email: null,
          phone: null,
          linkedin: null,
        },
      },
    };

    // website analysis
    if (companyData.domain) {
      try {
        // Make API call to analyze-website endpoint
        const websiteAnalysisResponse = await fetch(
          `${
            process.env.NODE_ENV === "production" &&
            process.env.NEXT_PUBLIC_VERCEL_URL
              ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
              : `http://localhost:3000`
          }/api/analyze-website`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              website: companyData.domain,
            }),
          }
        );

        if (!websiteAnalysisResponse.ok) {
          console.error(
            `❌ [API] Website analysis failed with status: ${websiteAnalysisResponse.status}`
          );
          throw new Error(
            `Website analysis request failed with status ${websiteAnalysisResponse.status}`
          );
        }

        const websiteAnalysisData = await websiteAnalysisResponse.json();
        console.log(
          `✅ [API] Website analysis completed successfully`,
          websiteAnalysisData
        );
        // Update companyData with the analysis results
        if (websiteAnalysisData.analysis) {
          const analysis = websiteAnalysisData.analysis;

          // Only spread the properties that exist in WebsiteAnalysis
          companyData = {
            ...companyData,
            ...Object.fromEntries(
              Object.entries(analysis).filter(([key]) => key in companyData)
            ),
            sales_channels: websiteAnalysisData.salesChannelsAnalysis,
          };
        }

        console.log(
          `✅ [API] Updated company data with website analysis`,
          companyData
        );
      } catch (error) {
        console.error(`❌ [API] Error analyzing website:`, error);
        // Continue with the process even if website analysis fails
      }
    } else {
      console.log(`⚠️ [API] No domain available for website analysis`);
    }

    // Key people analysis
    const keyPeople = await fetchAndEnrichKeyPersons(companyData.domain);

    // Update company data with key people
    companyData.key_people = keyPeople;

    // Save the company analysis to the database
    const dbResult = await saveCompanyAnalysisToDatabase(companyData);

    if (!dbResult.success) {
      console.error(
        `❌ [API] Failed to save company data to database: ${dbResult.error}`
      );
      // We'll continue even if database save fails
    }

    revalidatePath("/");
    return Response.json({
      success: true,
      company: companyData,
      source: isCRN ? "companies_house_and_apollo" : "apollo_direct",
      database_save: dbResult,
    });
  } catch (error) {
    revalidatePath("/");
    console.error(`❌ [API] Error processing request:`, error);

    return Response.json(
      { error: "Failed to process API request" },
      { status: 500 }
    );
  }
}

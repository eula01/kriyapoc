import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Define interface for Apollo person
interface ApolloPerson {
  id?: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  position: string;
}

// Define interface for BuiltWith technology data
interface BuiltWithData {
  ecomm_provider: string | null;
  psp_or_card_processor: string | null;
}

// Define interfaces for BuiltWith API response
interface BuiltWithTechnology {
  Name: string;
  Description?: string;
  Link?: string;
  Categories?: string[];
  Tag?: string;
  FirstDetected?: number;
  LastDetected?: number;
  IsPremium?: string;
}

interface BuiltWithPath {
  Technologies?: BuiltWithTechnology[];
  Domain?: string;
  Url?: string;
  SubDomain?: string;
  FirstIndexed?: number;
  LastIndexed?: number;
}

interface SpendHistoryItem {
  D: number; // Date timestamp
  S: number; // Spend amount
}

interface BuiltWithResult {
  Paths?: BuiltWithPath[];
  SpendHistory?: SpendHistoryItem[];
  IsDB?: string;
  Spend?: number;
}

interface BuiltWithResponse {
  Results?: Array<{
    Result?: BuiltWithResult;
    Lookup?: string;
  }>;
}

// Handler for Apollo API POST requests
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { domain, action, personId } = body;

    if (action === "searchPeople") {
      if (!domain) {
        return NextResponse.json(
          { error: "Domain is required" },
          { status: 400 }
        );
      }
      
      console.log(`🔄 [Apollo API] Searching for key people at domain: ${domain}`);
      
      // Fetch both API responses in parallel for better performance
      const [keyPersons, builtWithData] = await Promise.all([
        fetchKeyPersons(domain),
        fetchBuiltWithData(domain)
      ]);

      return NextResponse.json({ keyPersons, builtWithData });
    } else if (action === "enrichPerson") {
      if (!personId) {
        return NextResponse.json(
          { error: "Person ID is required" },
          { status: 400 }
        );
      }
      
      console.log(`🔄 [Apollo API] Enriching person data for ID: ${personId}`);
      
      const enrichedPerson = await enrichPersonData(personId);
      
      return NextResponse.json({ person: enrichedPerson });
    } else {
      return NextResponse.json(
        { error: "Invalid action specified" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`❌ [Apollo API] Error processing Apollo API request:`, error);
    
    return NextResponse.json(
      { error: "Failed to process Apollo API request" },
      { status: 500 }
    );
  }
}

// Function to fetch key persons from Apollo API
async function fetchKeyPersons(domain: string): Promise<ApolloPerson[]> {
  console.log(`🔍 [Apollo API] Starting search for key persons at domain: ${domain}`);

  try {
    // Apollo.io API endpoint for people search
    const url = "https://api.apollo.io/api/v1/mixed_people/search";
    console.log(`🔍 [Apollo API] Using Apollo API endpoint: ${url}`);

    // Combined search parameters for executive roles
    const executiveTitles = [
      // CEO titles
      "CEO",
      "Chief Executive Officer",
      "Founder",
      "Co-Founder",
      "Owner",
      "President",
      "Managing Director",
      // CFO titles
      "CFO",
      "Chief Financial Officer"
    ];
    
    console.log(
      `🔍 [Apollo API] Searching for executives with titles:`,
      executiveTitles
    );

    // Make API call to search for executives
    console.log(`🔍 [Apollo API] Searching for executives at ${domain}`);
    const response = await fetch(url, {
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
    });

    // Log response status and headers for debugging
    console.log(`🔍 [Apollo API] Response status: ${response.status}`);
    // console.log(`🔍 [Apollo API] Response headers:`, Object.fromEntries([...response.headers.entries()]));
    
    // Get response text first to inspect for any issues
    const responseText = await response.text();
    console.log(`🔍 [Apollo API] Response preview:`, responseText.substring(0, 250) + "...");
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`✅ [Apollo API] Successfully parsed JSON response`);
    } catch (e) {
      console.error(`❌ [Apollo API] Failed to parse JSON response:`, e);
      return [];
    }
    
    // Log the actual response data
    console.log(`✅ [Apollo API] API response structure:`, Object.keys(data));
    
    // Check if we got a valid data structure
    if (!data) {
      console.error(`❌ [Apollo API] No data in response`);
      return [];
    }
    
    // Apollo API may return results in either "people" or "contacts" array
    const peopleArray = data.people || data.contacts || [];
    
    console.log(
      `✅ [Apollo API] People found: ${peopleArray.length}`
    );
    
    // Return empty array if no people found
    if (peopleArray.length === 0) {
      console.log(`⚠️ [Apollo API] No people found for domain: ${domain}`);
      return [];
    }
    
    // Log a sample person to help with debugging
    console.log(`✅ [Apollo API] Sample person:`, JSON.stringify(peopleArray[0]).substring(0, 300) + "...");

    // Define an interface for the Apollo person
    interface ApolloContact {
      id: string;
      first_name: string;
      last_name: string;
      name?: string;
      title: string;
      email: string | null;
      sanitized_phone?: string | null;
      phone?: string | null;
      linkedin_url: string | null;
      organization?: {
        name?: string;
        website_url?: string;
      };
    }

    const keyPersons: ApolloPerson[] = [];

    // Process the contacts to find CEO and CFO
    if (peopleArray.length > 0) {
      // CEO title patterns
      const ceoTitlePatterns = [
        /ceo/i,
        /chief\s+executive/i,
        /founder/i,
        /co-founder/i,
        /owner/i,
        /president/i,
        /managing\s+director/i,
        /creative\s+director/i, // Added to match your sample data
      ];

      // CFO title patterns
      const cfoTitlePatterns = [
        /cfo/i,
        /chief\s+financial/i,
        /finance\s+director/i,
        /vp\s+of\s+finance/i,
        /financial\s+controller/i,
      ];

      // Find CEO
      const ceo = peopleArray.find(
        (person: ApolloContact) =>
          person.title &&
          ceoTitlePatterns.some((pattern) => pattern.test(person.title))
      );

      if (ceo) {
        console.log(
          `✅ [Apollo API] Found CEO: ${ceo.first_name} ${ceo.last_name} (${ceo.title})`
        );
        keyPersons.push({
          id: ceo.id,
          name: ceo.name || `${ceo.first_name} ${ceo.last_name}`,
          title: ceo.title || "CEO",
          email: ceo.email || null,
          phone: ceo.sanitized_phone || ceo.phone || null,
          linkedin: ceo.linkedin_url || null,
          position: "CEO",
        });
      } else {
        console.log(`⚠️ [Apollo API] No CEO found for ${domain}`);
        // Check if there's any person we could use as a CEO
        if (peopleArray.length > 0) {
          const firstPerson = peopleArray[0];
          console.log(`⚠️ [Apollo API] Using first person as CEO: ${firstPerson.first_name} ${firstPerson.last_name} (${firstPerson.title})`);
          keyPersons.push({
            id: firstPerson.id,
            name: firstPerson.name || `${firstPerson.first_name} ${firstPerson.last_name}`,
            title: firstPerson.title || "Leader",
            email: firstPerson.email || null,
            phone: firstPerson.sanitized_phone || firstPerson.phone || null,
            linkedin: firstPerson.linkedin_url || null,
            position: "CEO", // Still mark as CEO for UI consistency
          });
        }
      }

      // Find CFO (excluding the CEO if already found)
      const cfo = peopleArray.find(
        (person: ApolloContact) =>
          person.title &&
          cfoTitlePatterns.some((pattern) => pattern.test(person.title)) &&
          (!ceo || person.id !== ceo.id)
      );

      if (cfo) {
        console.log(
          `✅ [Apollo API] Found CFO: ${cfo.first_name} ${cfo.last_name} (${cfo.title})`
        );
        keyPersons.push({
          id: cfo.id,
          name: cfo.name || `${cfo.first_name} ${cfo.last_name}`,
          title: cfo.title || "CFO",
          email: cfo.email || null,
          phone: cfo.sanitized_phone || cfo.phone || null,
          linkedin: cfo.linkedin_url || null,
          position: "CFO",
        });
      } else {
        console.log(`⚠️ [Apollo API] No CFO found for ${domain}`);
        
        // Only try to add a second person if we have more than one and haven't added the first as CEO
        if (peopleArray.length > 1 && keyPersons.length > 0) {
          // Use the second person as CFO if available
          const secondPerson = peopleArray[1];
          console.log(`⚠️ [Apollo API] Using second person as CFO: ${secondPerson.first_name} ${secondPerson.last_name} (${secondPerson.title})`);
          keyPersons.push({
            id: secondPerson.id,
            name: secondPerson.name || `${secondPerson.first_name} ${secondPerson.last_name}`,
            title: secondPerson.title || "Financial Leader",
            email: secondPerson.email || null,
            phone: secondPerson.sanitized_phone || secondPerson.phone || null,
            linkedin: secondPerson.linkedin_url || null,
            position: "CFO", // Still mark as CFO for UI consistency
          });
        }
      }
    }

    console.log(`✅ [Apollo API] Returning ${keyPersons.length} key persons`);
    return keyPersons;
  } catch (error) {
    console.error(`❌ [Apollo API] Error fetching key persons:`, error);
    return [];
  }
}

// Function to fetch and process BuiltWith data
async function fetchBuiltWithData(domain: string): Promise<BuiltWithData> {
  console.log(`🔍 [BuiltWith API] Starting tech stack analysis for domain: ${domain}`);
  
  try {
    // BuiltWith API endpoint
    const url = `https://api.builtwith.com/v21/api.json`;
    console.log(`🔍 [BuiltWith API] Using BuiltWith API endpoint: ${url}`);
    
    // Make API call to BuiltWith
    console.log(`🔍 [BuiltWith API] Fetching tech stack data for ${domain}`);
    const response = await fetch(`${url}?KEY=${process.env.NEXT_PUBLIC_BUILTWITH_API_KEY || "f6de8ac5-217e-4647-a0b8-b0a25cb52394"}&LOOKUP=${domain}`);
    
    // Log response status for debugging
    console.log(`🔍 [BuiltWith API] Response status: ${response.status}`);
    
    // Get response JSON
    const data = await response.json() as BuiltWithResponse;
    
    // Check if we got a valid data structure
    if (!data || !data.Results || !data.Results[0] || !data.Results[0].Result) {
      console.error(`❌ [BuiltWith API] No valid data in response`);
      return {
        ecomm_provider: null,
        psp_or_card_processor: null
      };
    }
    
    console.log(`✅ [BuiltWith API] Successfully received tech data for ${domain}`);
    
    // Extract all technologies from all paths
    const allTechnologies: BuiltWithTechnology[] = [];
    const paths = data.Results[0].Result.Paths || [];
    
    paths.forEach((path: BuiltWithPath) => {
      if (path.Technologies && Array.isArray(path.Technologies)) {
        allTechnologies.push(...path.Technologies);
      }
    });
    
    console.log(`✅ [BuiltWith API] Found ${allTechnologies.length} technologies`);
    
    // Filter for eCommerce platforms
    const ecommPlatforms = allTechnologies.filter(tech => 
      tech.Categories && 
      Array.isArray(tech.Categories) && 
      tech.Categories.some((category: string) => category === "eCommerce" || category === "Shopify App")
    );
    
    // Filter for payment processors
    const paymentProcessors = allTechnologies.filter(tech => 
      tech.Categories && 
      Array.isArray(tech.Categories) && 
      tech.Categories.some((category: string) => 
        category === "Payments Processor" || 
        category === "Pay Later"
      )
    );
    
    console.log(`✅ [BuiltWith API] Found ${ecommPlatforms.length} eCommerce platforms and ${paymentProcessors.length} payment processors`);
    
    // Format the results as comma-separated lists
    const ecommProvidersList = ecommPlatforms.map(tech => tech.Name).join(", ");
    const paymentProcessorsList = paymentProcessors.map(tech => tech.Name).join(", ");
    
    return {
      ecomm_provider: ecommProvidersList || null,
      psp_or_card_processor: paymentProcessorsList || null
    };
  } catch (error) {
    console.error(`❌ [BuiltWith API] Error fetching tech stack data:`, error);
    return {
      ecomm_provider: null,
      psp_or_card_processor: null
    };
  }
}

// Function to fetch enriched person data from Apollo API
async function enrichPersonData(personId: string) {
  console.log(`🔍 [Apollo API] Starting person enrichment for ID: ${personId}`);

  try {
    // Apollo.io API endpoint for people enrichment
    const url = "https://api.apollo.io/api/v1/people/match";
    console.log(`🔍 [Apollo API] Using Apollo API endpoint: ${url}`);

    // Prepare the request payload - Include reveal parameters for emails and phone in initial request
    const payload = {
      id: personId, // Apollo ID for the person
      reveal_personal_emails: true,
      reveal_phone_number: true
    };
    
    console.log(`🔍 [Apollo API] Request payload:`, payload);

    // Make API call to Apollo
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-API-KEY": process.env.NEXT_PUBLIC_APOLLO_API_KEY || "",
      },
      body: JSON.stringify(payload),
    });

    // Check for response errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ [Apollo API] Error enriching person data: status ${response.status}`,
        errorText
      );
      return null;
    }

    // Parse response data
    const data = await response.json();
    console.log(`✅ [Apollo API] Received enrichment response`, data);

    // If no person found
    if (!data || !data.person) {
      console.log(`⚠️ [Apollo API] No person found with ID: ${personId}`);
      return null;
    }

    console.log(`✅ [Apollo API] Successfully enriched person data`);
    
    // Additional logging to see what email/phone we got
    console.log(`👀 [Apollo API] Person email:`, data.person.email || 'none');
    console.log(`👀 [Apollo API] Person phone:`, data.person.phone || data.person.sanitized_phone || 'none');
    
    // Extract and format the contact data
    const email = data.person.email || null;
    let phone = null;
    
    if (data.person.phone) {
      phone = data.person.phone;
    } else if (data.person.sanitized_phone) {
      phone = data.person.sanitized_phone;
    } else if (data.person.contact && data.person.contact.phone_number) {
      phone = data.person.contact.phone_number;
    }
    
    // If we didn't get email/phone from the first request, try a second request with different parameters
    if (!email || !phone) {
      console.log(`🔍 [Apollo API] First request didn't yield complete contact data, trying alternate enrichment`);
      
      // Make a second API call specifically for contact enrichment
      try {
        const enrichUrl = "https://api.apollo.io/api/v1/people/contact";
        const enrichResponse = await fetch(enrichUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache",
            "X-API-KEY": process.env.NEXT_PUBLIC_APOLLO_API_KEY || "",
          },
          body: JSON.stringify({
            id: personId,
            reveal_personal_emails: true
          }),
        });
        
        if (enrichResponse.ok) {
          const enrichData = await enrichResponse.json();
          console.log(`✅ [Apollo API] Received additional contact enrichment response`);
          
          // Update email if we got one from the second request
          if (enrichData.person && enrichData.person.email && (!email || email.includes("domain.com"))) {
            console.log(`✅ [Apollo API] Found better email in second request: ${enrichData.person.email}`);
            const newEmail = enrichData.person.email;
            // Return the merged data with better email
            return {
              ...data.person,
              email: newEmail,
              contact: {
                phone_number: phone
              }
            };
          }
        }
      } catch (enrichError) {
        console.error(`❌ [Apollo API] Error in secondary enrichment:`, enrichError);
        // Continue with original data if secondary request fails
      }
    }
    
    // Return the person data with contact information
    return {
      ...data.person,
      email,
      contact: {
        phone_number: phone
      }
    };
  } catch (error) {
    console.error(`❌ [Apollo API] Error enriching person data:`, error);
    return null;
  }
} 
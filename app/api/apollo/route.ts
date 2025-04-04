import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchBuiltWithData } from "@/lib/util";

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
export interface BuiltWithData {
  ecomm_provider: string | null;
  psp_or_card_processor: string | null;
}

// Define interfaces for BuiltWith API response
export interface BuiltWithTechnology {
  Name: string;
  Description?: string;
  Link?: string;
  Categories?: string[];
  Tag?: string;
  FirstDetected?: number;
  LastDetected?: number;
  IsPremium?: string;
}

export interface BuiltWithPath {
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

export interface BuiltWithResult {
  Paths?: BuiltWithPath[];
  SpendHistory?: SpendHistoryItem[];
  IsDB?: string;
  Spend?: number;
}

export interface BuiltWithResponse {
  Results?: Array<{
    Result?: BuiltWithResult;
    Lookup?: string;
  }>;
}

// Interface for Apollo API response person
export interface ApolloContactPerson {
  id: string;
  first_name: string;
  last_name: string;
  name?: string;
  title: string;
  email: string | null;
  sanitized_phone?: string | null;
  phone?: string | null;
  linkedin_url: string | null;
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

      console.log(
        `🔄 [Apollo API] Searching for key people at domain: ${domain}`
      );

      // Fetch both API responses in parallel for better performance
      const [keyPersons, builtWithData] = await Promise.all([
        fetchKeyPersons(domain),
        fetchBuiltWithData(domain),
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
      console.log(
        `🔄🔄🔄🔄🔄 [Apollo API] Enriched person data:`,
        enrichedPerson
      );

      return NextResponse.json({ person: enrichedPerson });
    } else {
      return NextResponse.json(
        { error: "Invalid action specified" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(
      `❌ [Apollo API] Error processing Apollo API request:`,
      error
    );

    return NextResponse.json(
      { error: "Failed to process Apollo API request" },
      { status: 500 }
    );
  }
}

// Simplified key persons fetching function
async function fetchKeyPersons(domain: string): Promise<ApolloPerson[]> {
  console.log(
    `🔍 [Apollo API] Starting search for key persons at domain: ${domain}`
  );

  // List of executive titles to search for
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
    "Chief Financial Officer",
  ];

  console.log(
    `🔍 [Apollo API] Searching for executives with titles:`,
    executiveTitles
  );

  // Use the apolloApiCall helper
  const result = await apolloApiCall(
    "https://api.apollo.io/api/v1/mixed_people/search",
    {
      q_organization_domains_list: [domain],
      person_titles: executiveTitles,
      person_seniorities: ["owner", "founder", "c_suite"],
      per_page: 5,
      page: 1,
    }
  );

  // Return empty array if request failed
  if (!result.success) {
    console.error(`❌ [Apollo API] Failed to fetch key persons`);
    return [];
  }

  // Get the array of people from the response
  const peopleArray = (result.data.people ||
    result.data.contacts ||
    []) as ApolloContactPerson[];
  console.log(`✅ [Apollo API] People found: ${peopleArray.length}`);

  console.log(
    `💾 [Apollo API] People found: ${JSON.stringify(peopleArray, null, 2)}`
  );

  if (peopleArray.length === 0) {
    console.log(`⚠️ [Apollo API] No people found for domain: ${domain}`);
    return [];
  }

  // Patterns to identify CEO and CFO titles
  const ceoPatterns = [
    /ceo/i,
    /chief\s+executive/i,
    /founder/i,
    /co-founder/i,
    /owner/i,
    /president/i,
    /managing\s+director/i,
    /creative\s+director/i,
  ];
  const cfoPatterns = [
    /cfo/i,
    /chief\s+financial/i,
    /finance\s+director/i,
    /vp\s+of\s+finance/i,
    /financial\s+controller/i,
  ];

  // Helper function to format person data
  const formatPerson = (
    person: ApolloContactPerson,
    position: string
  ): ApolloPerson => ({
    id: person.id,
    name: person.name || `${person.first_name} ${person.last_name}`,
    title: person.title || (position === "CEO" ? "CEO" : "CFO"),
    email: person.email || null,
    phone: person.sanitized_phone || person.phone || null,
    linkedin: person.linkedin_url || null,
    position: position,
  });

  const keyPersons: ApolloPerson[] = [];

  // Find CEO
  const ceo = peopleArray.find(
    (person: ApolloContactPerson) =>
      person.title && ceoPatterns.some((pattern) => pattern.test(person.title))
  );

  if (ceo) {
    console.log(
      `✅ [Apollo API] Found CEO: ${ceo.first_name} ${ceo.last_name} (${ceo.title})`
    );
    keyPersons.push(formatPerson(ceo, "CEO"));
  } else if (peopleArray.length > 0) {
    // Use first person as CEO if no specific CEO found
    console.log(
      `⚠️ [Apollo API] No CEO found, using first person as CEO: ${peopleArray[0].first_name} ${peopleArray[0].last_name}`
    );
    keyPersons.push(formatPerson(peopleArray[0], "CEO"));
  }

  // Find CFO (excluding the CEO if already found)
  const cfo = peopleArray.find(
    (person: ApolloContactPerson) =>
      person.title &&
      cfoPatterns.some((pattern) => pattern.test(person.title)) &&
      (!ceo || person.id !== ceo.id)
  );

  if (cfo) {
    console.log(
      `✅ [Apollo API] Found CFO: ${cfo.first_name} ${cfo.last_name} (${cfo.title})`
    );
    keyPersons.push(formatPerson(cfo, "CFO"));
  } else if (peopleArray.length > 1 && keyPersons.length > 0) {
    // Use second person as CFO if available and we already have a CEO
    const secondPerson =
      peopleArray.find((p: ApolloContactPerson) => p.id !== keyPersons[0].id) ||
      peopleArray[1];
    console.log(
      `⚠️ [Apollo API] No CFO found, using second person as CFO: ${secondPerson.first_name} ${secondPerson.last_name}`
    );
    keyPersons.push(formatPerson(secondPerson, "CFO"));
  }

  console.log(`✅ [Apollo API] Returning ${keyPersons.length} key persons`);
  return keyPersons;
}

// Helper function for making Apollo API calls with consistent error handling
async function apolloApiCall(url: string, payload: any) {
  console.log(`🔍 [Apollo API] Calling endpoint: ${url}`);
  console.log(`🔍 [Apollo API] Request payload:`, payload);

  try {
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

    // Log response status
    console.log(`🔍 [Apollo API] Response status: ${response.status}`);

    // Handle response errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ [Apollo API] API error: status ${response.status}`,
        errorText
      );
      return { success: false, error: `API error: ${response.status}` };
    }

    // Get response text first to help debug any JSON parsing issues
    const responseText = await response.text();

    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      console.log(`✅ [Apollo API] Successfully processed API response`);
      return { success: true, data };
    } catch (jsonError) {
      console.error(
        `❌ [Apollo API] Failed to parse JSON response:`,
        jsonError
      );
      return { success: false, error: "Failed to parse API response" };
    }
  } catch (error) {
    console.error(`❌ [Apollo API] Network error:`, error);
    return { success: false, error: "Network error" };
  }
}

// Simplified function to fetch enriched person data using the helper
async function enrichPersonData(personId: string) {
  console.log(`🔍 [Apollo API] Starting person enrichment for ID: ${personId}`);

  // First attempt - use the main enrichment endpoint
  const initialPayload = {
    id: personId,
    reveal_personal_emails: true,
    // reveal_phone_number: true,
    webhook_url: "https://api.apollo.io/api/v1/people/match",
  };

  const primaryResult = await apolloApiCall(
    "https://api.apollo.io/api/v1/people/match",
    initialPayload
  );

  // Process the primary response
  if (primaryResult.success && primaryResult.data.person) {
    const person = primaryResult.data.person;

    // Extract the contact information
    const contactInfo = {
      email: person.email || null,
      phone_number:
        person.phone ||
        person.sanitized_phone ||
        (person.contact ? person.contact.phone_number : null) ||
        null,
    };

    // Only try secondary enrichment if we're missing email or phone
    if (!contactInfo.email || !contactInfo.phone_number) {
      console.log(
        `🔍 [Apollo API] First request didn't yield complete contact data, trying alternate enrichment`
      );

      // Try secondary enrichment endpoint
      const secondaryResult = await apolloApiCall(
        "https://api.apollo.io/api/v1/people/contact",
        { id: personId, reveal_personal_emails: true }
      );

      // If successful, update with any new information
      if (secondaryResult.success && secondaryResult.data.person) {
        const secondaryPerson = secondaryResult.data.person;

        // Update email if we got a better one (non-null or not a placeholder)
        if (
          secondaryPerson.email &&
          (!contactInfo.email ||
            contactInfo.email.includes("domain.com") ||
            contactInfo.email.includes("not_unlocked"))
        ) {
          console.log(
            `✅ [Apollo API] Found better email in second request: ${secondaryPerson.email}`
          );
          contactInfo.email = secondaryPerson.email;
        }
      }
    }

    // Log what we found
    console.log(
      `✅✅✅✅ [Apollo API] Final enriched data - Email: ${
        contactInfo.email || "none"
      }, Phone: ${contactInfo.phone_number || "none"}`
    );

    // Return the person with updated contact information
    return {
      ...person,
      email: contactInfo.email,
      contact: {
        phone_number: contactInfo.phone_number,
      },
    };
  }

  console.log(`⚠️ [Apollo API] Could not enrich person with ID: ${personId}`);
  return null;
}

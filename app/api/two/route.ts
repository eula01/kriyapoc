import { fetchCompanyByCRN } from "@/lib/actions/companieshouse";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log("🚀 ~ POST ~ body:", body)
    const { name: fullName, company: companyIdentifier } = body;

    // Validate input parameters
    if (!fullName) {
      return Response.json(
        { success: false, error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!companyIdentifier) {
      return Response.json(
        {
          success: false,
          error: "Company identifier (CRN or website) is required",
        },
        { status: 400 }
      );
    }

    // Check if the identifier is a CRN (starts with 3 numbers) or a website
    const isCRN = /^\d{3}/.test(companyIdentifier);
    let companyName;
    let companyDomain;

    // Step 1: Get company information based on the identifier
    if (isCRN) {
      console.log(`[API] Processing request for CRN: ${companyIdentifier}`);

      // Get company name from Companies House using the CRN
      const companyHouseResult = await fetchCompanyByCRN(companyIdentifier);

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

      companyName = companyHouseResult.companyName;
      console.log(
        `[API] Company name found from Companies House: ${companyName}`
      );

      // Search Apollo for company website
      const apolloCompanyResult = await searchApollo(companyName);

      if (
        !apolloCompanyResult.success ||
        !apolloCompanyResult.data.organizations?.length
      ) {
        return Response.json(
          {
            success: false,
            error:
              apolloCompanyResult.error ||
              `Company not found on Apollo: ${companyName}`,
          },
          { status: 404 }
        );
      }

      companyDomain = apolloCompanyResult.data.organizations[0].primary_domain;

      if (!companyDomain) {
        return Response.json(
          {
            success: false,
            error: `No domain found for company: ${companyName}`,
          },
          { status: 404 }
        );
      }

      console.log(`[API] Company domain found: ${companyDomain}`);
    } else {
      // Use the provided domain directly
      companyDomain = normalizeDomain(companyIdentifier);
      console.log(`[API] Using provided domain: ${companyDomain}`);
    }

    // Step 2: Search for people at the company with the given name
    const peopleSearchResult = await searchPeopleAtCompany(
      companyDomain,
      fullName
    );

    if (
      !peopleSearchResult.success ||
      !peopleSearchResult.data.people?.length
    ) {
      return Response.json(
        {
          success: false,
          error:
            peopleSearchResult.error ||
            `No person found matching '${fullName}' at company`,
        },
        { status: 404 }
      );
    }

    // Find the best match from returned people
    const matchedPerson = findBestPersonMatch(
      peopleSearchResult.data.people,
      fullName
    );

    if (!matchedPerson) {
      return Response.json(
        {
          success: false,
          error: `No suitable match found for '${fullName}' at company`,
        },
        { status: 404 }
      );
    }

    // Step 3: Enrich the person's information
    const enrichedPerson = await enrichPersonData(matchedPerson);

    // Return the enriched contact information
    revalidatePath("/");
    return Response.json({
      success: true,
      contact: {
        name: enrichedPerson.name,
        title: enrichedPerson.title,
        linkedin: enrichedPerson.linkedin,
        email: enrichedPerson.email,
        phone: enrichedPerson.phone,
        company: {
          name: companyName || "",
          domain: companyDomain,
        },
      },
    });
  } catch (error) {
    revalidatePath("/");
    console.error(`[API] Error processing request:`, error);
    return Response.json(
      { success: false, error: "Failed to process API request" },
      { status: 500 }
    );
  }
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

// Helper function for Apollo API company searches
async function searchApollo(companyName: string) {
  console.log(`[Apollo API] Searching for company name: ${companyName}`);

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
    return { success: true, data };
  } catch (error) {
    console.error(`[Apollo API] Error searching for company:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Helper function for Apollo API people searches
async function searchPeopleAtCompany(domain: string, fullName: string) {
  console.log(
    `[Apollo API] Searching for person: ${fullName} at domain: ${domain}`
  );

  try {
    // Apollo.io API endpoint for people search
    const url = "https://api.apollo.io/api/v1/mixed_people/search";

    // Set up request payload
    const payload = {
      q_organization_domains_list: [domain],
      q_person_name: fullName,
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
    return { success: true, data };
  } catch (error) {
    console.error(`[Apollo API] Error searching for person:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Helper function to find the best match from returned people results
function findBestPersonMatch(people: any[], fullName: string) {
  if (!people || people.length === 0) return null;

  // Normalize the search name
  const searchName = fullName.toLowerCase().trim();

  // First try exact match
  for (const person of people) {
    const personFullName = `${person.first_name} ${person.last_name}`
      .toLowerCase()
      .trim();
    if (personFullName === searchName) {
      return person;
    }
  }

  // Then try partial match (first name + last name beginning)
  // Split search name into parts
  const searchParts = searchName.split(" ");
  const searchFirstName = searchParts[0];
  const searchLastName =
    searchParts.length > 1 ? searchParts[searchParts.length - 1] : "";

  for (const person of people) {
    const personFirstName = (person.first_name || "").toLowerCase();
    const personLastName = (person.last_name || "").toLowerCase();

    if (
      personFirstName === searchFirstName &&
      (personLastName.startsWith(searchLastName) ||
        searchLastName.startsWith(personLastName))
    ) {
      return person;
    }
  }

  // If no match found, return the first result
  return people[0];
}

// Helper function to enrich person data
async function enrichPersonData(person: any) {
  console.log(`[Apollo API] Enriching data for person ID: ${person.id}`);

  try {
    if (!person.id) {
      // Return basic information if no ID is available
      return {
        name: `${person.first_name} ${person.last_name}`,
        title: person.title || null,
        linkedin: person.linkedin_url || null,
        email: person.email || null,
        phone: person.phone || person.sanitized_phone || null,
      };
    }

    // Apollo.io API endpoint for person enrichment
    const url = "https://api.apollo.io/api/v1/people/match";

    // Set up request payload
    const payload = {
      id: person.id,
      reveal_personal_emails: true,
      // reveal_phone_number: true,
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

    const data = await response.json();

    console.log(
      `🔍🔍🔍🔍🔍🔍🔍 [Apollo API] Enrichment data: ${JSON.stringify(
        data,
        null,
        2
      )}`
    );

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`);
    }

    if (!data.person) {
      throw new Error("No person data returned from enrichment endpoint");
    }

    // Return enriched information
    return {
      name: `${data.person.first_name} ${data.person.last_name}`,
      title: data.person.title || person.title || null,
      linkedin: data.person.linkedin_url || person.linkedin_url || null,
      email: data.person.email || person.email || null,
      phone:
        data.person.phone ||
        data.person.sanitized_phone ||
        person.phone ||
        person.sanitized_phone ||
        null,
    };
  } catch (error) {
    console.error(`[Apollo API] Error enriching person data:`, error);

    // Return basic information if enrichment fails
    return {
      name: `${person.first_name} ${person.last_name}`,
      title: person.title || null,
      linkedin: person.linkedin_url || null,
      email: person.email || null,
      phone: person.phone || person.sanitized_phone || null,
    };
  }
}

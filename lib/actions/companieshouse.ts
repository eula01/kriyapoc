'use server';

/**
 * Server action to fetch company data from Companies House API
 * This avoids CORS issues by proxying the request through the server
 */
export async function fetchCompanyByCRN(crn: string): Promise<{ companyName: string | null; error?: string }> {
  console.log(`🔍 [Server Action] Searching Companies House for CRN: ${crn}`);
  
  try {
    // Companies House API endpoint for company search
    const url = `https://api.company-information.service.gov.uk/company/${crn}`;
    
    // Create headers with authorization
    const headers = new Headers();
    headers.append("Authorization", "Basic M2RmZmZjMDUtMGZmYy00NWMzLTg4YzUtZTlkNzg4YzQwMWVkOg==");
    
    // Set up request options
    const requestOptions = {
      method: "GET",
      headers: headers,
    };
    
    // Make API request to Companies House
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorStatus = response.status;
      console.error(`❌ [Server Action] Companies House API error ${errorStatus}`);
      
      if (errorStatus === 404) {
        return { companyName: null, error: "Company not found" };
      }
      
      return { 
        companyName: null, 
        error: `Companies House API error: ${errorStatus}` 
      };
    }
    
    const data = await response.json();
    
    // Extract company name from response
    if (data.company_name) {
      // Clean up company name by removing LTD, PLC, etc.
      const cleanedName = data.company_name
        .replace(/\s+(LIMITED|LTD|PLC|LLC|INC|INCORPORATED|CORPORATION|CORP)\.?$/i, '')
        .trim();
      
      console.log(`✅ [Server Action] Found company: ${cleanedName}`);
      return { companyName: cleanedName };
    } else {
      console.log(`❌ [Server Action] No company name found in response`);
      return { companyName: null, error: "No company name found in response" };
    }
  } catch (error) {
    console.error(`❌ [Server Action] Error searching for company:`, error);
    return { 
      companyName: null, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
} 
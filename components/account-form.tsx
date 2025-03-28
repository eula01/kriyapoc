"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createAccount, updateAccount, getAccountById } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import {
  Phone,
  Globe,
  Briefcase,
  Calendar,
  Users,
  Sparkles,
} from "lucide-react";
import {
  analyzeWebsite,
  WebsiteAnalysis,
} from "@/lib/services/website-analyzer";
import { useAccountsStore } from "@/lib/store/accounts-store";
import { useRouter } from "next/navigation";
import { fetchCompanyByCRN } from "@/lib/actions/companieshouse";

// Schema for website search validation
const searchSchema = z.object({
  website: z.string().min(1, { message: "text is required" }),
});

// Schema for CRN search validation
const crnSchema = z.object({
  crn: z.string().min(1, { message: "CRN is required" }),
});

type SearchValues = z.infer<typeof searchSchema>;
type CRNSearchValues = z.infer<typeof crnSchema>;

interface AccountFormProps {
  onSuccess: () => void;
}

// Types for Apollo.io API response based on actual response structure
interface PrimaryPhone {
  number: string;
  source: string;
  sanitized_number: string;
}

interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string | null;
  blog_url: string | null;
  angellist_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  primary_phone: PrimaryPhone | null;
  languages: string[];
  alexa_ranking: number | null;
  phone: string | null;
  linkedin_uid: string | null;
  founded_year: number | null;
  publicly_traded_symbol: string | null;
  publicly_traded_exchange: string | null;
  logo_url: string | null;
  crunchbase_url: string | null;
  primary_domain: string;
  sanitized_phone: string | null;
  owned_by_organization_id: string | null;
  intent_strength: string | null;
  show_intent: boolean;
  has_intent_signal_account: boolean;
  intent_signal_account: unknown | null;
}

interface ApolloApiResponse {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
  breadcrumbs: Array<{
    label: string;
    signal_field_name: string;
    value: string;
    display_name: string;
  }>;
}

// Company lead data structure mapped from Apollo.io API response
type CompanyLead = {
  id: string;
  name: string;
  website: string;
  icon: string;
  phone: string | null;
  founded_year: number | null;
  linkedin_url: string | null;
  languages: string[];
  alexa_ranking: number | null;
  publicly_traded: {
    symbol: string | null;
    exchange: string | null;
  } | null;
  headcount: string; // Not directly from API, will be derived from breadcrumbs
  websiteAnalysis?: WebsiteAnalysis;
  isAnalyzing?: boolean;
};

// Define interface for the person object to use in the enrichment function
interface KeyPerson {
  id?: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  position: string;
}

// Define interface for enriched contact info
interface EnrichedContactInfo {
  email: string | null;
  phone_number: string | null;
}

export default function AccountForm({ onSuccess }: AccountFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCRNLoading, setIsCRNLoading] = useState(false);
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCRN, setCurrentCRN] = useState<string | null>(null);
  const { startAnalyzing, stopAnalyzing } = useAccountsStore();
  const router = useRouter();

  const { register, handleSubmit, formState, reset } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
  });

  const { 
    register: registerCRN, 
    handleSubmit: handleSubmitCRN, 
    formState: crnFormState,
    reset: resetCRN
  } = useForm<CRNSearchValues>({
    resolver: zodResolver(crnSchema),
  });

  const { errors } = formState;
  const { errors: crnErrors } = crnFormState;

  // Function to fetch company data from Apollo.io API
  async function searchLeads(website: string): Promise<CompanyLead[]> {
    console.log(`🔍 [Lead Search] Starting search for website: ${website}`);

    // Prepare the domain name for search
    const domain = website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    console.log(`🔍 [Lead Search] Processed domain for search: ${domain}`);

    try {
      // Apollo.io API endpoint for company search
      const url = "https://api.apollo.io/api/v1/mixed_companies/search";
      console.log(`🔍 [Lead Search] Using Apollo API endpoint: ${url}`);

      // Set up request payload
      const payload = {
        // Search directly by website domain
        q_organization_name: domain,
        // Fetch a reasonable number of results
        per_page: 10,
        page: 1,
      };
      console.log(`🔍 [Lead Search] Request payload:`, payload);

      // Make API request to Apollo.io
      console.log(`🔍 [Lead Search] Sending request to Apollo API...`);
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
        const errorText = await response.text();
        console.error(
          `❌ [Lead Search] Apollo API error ${response.status}:`,
          errorText
        );
        throw new Error(`Apollo API error: ${response.status}`);
      }

      console.log(`✅ [Lead Search] Received response from Apollo API`);
      const data = (await response.json()) as ApolloApiResponse;
      console.log(
        `✅ [Lead Search] Found ${data.organizations.length} organizations`
      );

      // Get headcount info from breadcrumbs if available
      const headcountRanges = data.breadcrumbs
        .filter(
          (crumb) =>
            crumb.signal_field_name === "organization_num_employees_ranges"
        )
        .map((crumb) => crumb.display_name);
      console.log(
        `✅ [Lead Search] Extracted headcount ranges:`,
        headcountRanges
      );

      // Transform Apollo.io results to our format
      const transformedLeads = data.organizations.map((org) => ({
        id: org.id,
        name: org.name,
        website: org.website_url || `http://${org.primary_domain}`,
        icon: org.logo_url || "/logos/default.svg",
        phone:
          org.phone || (org.primary_phone ? org.primary_phone.number : null),
        founded_year: org.founded_year,
        linkedin_url: org.linkedin_url,
        languages: org.languages || [],
        alexa_ranking: org.alexa_ranking,
        publicly_traded: org.publicly_traded_symbol
          ? {
              symbol: org.publicly_traded_symbol,
              exchange: org.publicly_traded_exchange,
            }
          : null,
        // Use employee ranges from breadcrumbs if available, or "Unknown"
        headcount:
          headcountRanges.length > 0 ? headcountRanges.join(", ") : "Unknown",
        isAnalyzing: false,
      }));
      console.log(
        `✅ [Lead Search] Transformed ${transformedLeads.length} leads to our format`
      );

      return transformedLeads;
    } catch (error) {
      console.error(`❌ [Lead Search] Error searching for leads:`, error);

      // For development/testing, return mock data when API isn't available
      console.log(`🔄 [Lead Search] Using fallback mock data instead`);
      return getMockData(domain);
    }
  }

  // Function to generate mock data when API is unavailable
  function getMockData(domain: string): CompanyLead[] {
    return [
      {
        id: "1",
        name: domain.charAt(0).toUpperCase() + domain.slice(1) + " Inc.",
        website: `http://${domain}`,
        icon: "/logos/default.svg",
        phone: "+1 (555) 123-4567",
        founded_year: 2010,
        linkedin_url: `http://linkedin.com/company/${domain}`,
        languages: ["English"],
        alexa_ranking: 10000,
        publicly_traded: null,
        headcount: "50-100",
        isAnalyzing: false,
      },
      {
        id: "2",
        name: domain.charAt(0).toUpperCase() + domain.slice(1) + " Global",
        website: `http://global.${domain}`,
        icon: "/logos/default.svg",
        phone: "+44 20 1234 5678",
        founded_year: 2005,
        linkedin_url: `http://linkedin.com/company/global-${domain}`,
        languages: ["English", "French"],
        alexa_ranking: 25000,
        publicly_traded: {
          symbol: "GLD",
          exchange: "nyse",
        },
        headcount: "100-250",
        isAnalyzing: false,
      },
      {
        id: "3",
        name:
          domain.charAt(0).toUpperCase() + domain.slice(1) + " Technologies",
        website: `http://tech.${domain}`,
        icon: "/logos/default.svg",
        phone: "+1 (555) 987-6543",
        founded_year: 2015,
        linkedin_url: `http://linkedin.com/company/${domain}-tech`,
        languages: ["English"],
        alexa_ranking: 75000,
        publicly_traded: null,
        headcount: "25-50",
        isAnalyzing: false,
      },
    ];
  }

  async function onSearch(data: SearchValues) {
    console.log(`🔍 [Search Form] Search initiated for: ${data.website}`);

    try {
      setIsLoading(true);
      setError(null);
      
      // Reset any previously set CRN since this is a website search
      setCurrentCRN(null);
      
      console.log(`🔍 [Search Form] Calling searchLeads function...`);

      const results = await searchLeads(data.website);
      console.log(
        `✅ [Search Form] Search complete, found ${results.length} results`
      );

      if (results.length === 0) {
        console.log(`ℹ️ [Search Form] No results found`);
        setError("No companies found. Try a different search term.");
      }

      setLeads(results);
      setSelectedLeads([]);
    } catch (error) {
      console.error(`❌ [Search Form] Error during search:`, error);
      setError("Failed to search for companies. Please try again.");
    } finally {
      console.log(
        `🔄 [Search Form] Search process complete, resetting loading state`
      );
      setIsLoading(false);
    }
  }

  function toggleLeadSelection(id: string) {
    console.log(`🔄 [Lead Selection] Toggling selection for lead ID: ${id}`);

    setSelectedLeads((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((leadId) => leadId !== id)
        : [...prev, id];

      console.log(`🔄 [Lead Selection] Updated selection:`, newSelection);
      return newSelection;
    });
  }

  // Function to fetch key persons from Apollo People API
  async function fetchKeyPersons(domain: string) {
    console.log(
      `🔍 [Key Persons Search] Starting search for domain: ${domain}`
    );

    try {
      // Call our custom API endpoint instead of Apollo directly
      console.log(`🔍 [Key Persons Search] Calling Apollo API endpoint`);
      const apiUrl = "/api/apollo";
      console.log(`🔍 [Key Persons Search] API URL: ${apiUrl}`);
      
      const requestBody = {
        domain,
        action: "searchPeople"
      };
      console.log(`🔍 [Key Persons Search] Request payload:`, requestBody);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Log response status
      console.log(
        `🔍 [Key Persons Search] API response status: ${response.status}`
      );

      // Handle response errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ [Key Persons Search] API error: status ${response.status}`,
          errorText
        );
        return { keyPersons: [], builtWithData: { ecomm_provider: null, psp_or_card_processor: null } };
      }

      // Parse response data
      const data = await response.json();
      console.log(
        `✅ [Key Persons Search] API response received:`, 
        data
      );

      // Get the BuiltWith data from the response
      const builtWithData = data.builtWithData || {
        ecomm_provider: null,
        psp_or_card_processor: null
      };
      
      console.log(`✅ [Key Persons Search] Extracted BuiltWith data:`, builtWithData);

      return { keyPersons: data.keyPersons || [], builtWithData };
    } catch (error) {
      console.error(`❌ [Key Persons Search] Error:`, error);
      return { keyPersons: [], builtWithData: { ecomm_provider: null, psp_or_card_processor: null } };
    }
  }

  // Function to enrich all found executives with contact information
  async function enrichExecutiveContactInfo(keyPersons: KeyPerson[]): Promise<KeyPerson[]> {
    console.log(`🔍 [Executive Enrichment] Starting enrichment for ${keyPersons.length} persons`);
    
    // Create a copy of the key persons array to avoid modifying the original
    const enrichedPersons = [...keyPersons];
    
    // Look for executives (CEO, CFO) to enrich
    for (let i = 0; i < enrichedPersons.length; i++) {
      const person = enrichedPersons[i];
      const title = person.title?.toLowerCase() || "";
      const position = person.position?.toLowerCase() || "";
      
      // Check if this is an executive role we want to enrich
      if (title.includes("ceo") || 
          title.includes("chief executive officer") || 
          title.includes("founder") ||
          title.includes("cfo") || 
          title.includes("chief financial officer") ||
          title.includes("owner") ||
          title.includes("president") ||
          title.includes("director") ||
          position === "ceo" ||
          position === "CEO" ||
          position === "cfo" ||
          position === "CFO") {
        
        console.log(`🔍 [Executive Enrichment] Found executive: ${person.name} (${person.title || person.position})`);
        
        // Check if the current email looks like a placeholder or is missing
        const needsEmailEnrichment = !person.email || 
                                    person.email.includes("domain.com") || 
                                    person.email.includes("not_unlocked") ||
                                    person.email.includes("apollo.io");
        
        // Check if the phone is missing or needs enrichment
        const needsPhoneEnrichment = !person.phone;
        
        // Skip if we already have valid contact info
        if (!needsEmailEnrichment && !needsPhoneEnrichment) {
          console.log(`✅ [Executive Enrichment] Executive ${person.name} already has valid contact info`);
          continue;
        }
        
        // Enrich the executive with contact information
        if (person.id) {
          console.log(`🔍 [Executive Enrichment] Enriching contact info for ${person.name} (id: ${person.id})`);
          const enrichedInfo = await enrichPersonContactInfo(person.id);
          
          // Update the person data with enriched information
          if (enrichedInfo) {
            console.log(`✅ [Executive Enrichment] Successfully enriched contact info for ${person.name}`);
            
            // Create updated person object with enriched data
            const updatedPerson = { ...person };
            
            // Update email if we got a valid one and current one is missing or placeholder
            if (enrichedInfo.email && 
                needsEmailEnrichment) {
              console.log(`✅ [Executive Enrichment] Updated email for ${person.name}: ${enrichedInfo.email}`);
              updatedPerson.email = enrichedInfo.email;
            }
            
            // Update phone if we got a valid one and current one is missing
            if (enrichedInfo.phone_number && needsPhoneEnrichment) {
              console.log(`✅ [Executive Enrichment] Updated phone for ${person.name}: ${enrichedInfo.phone_number}`);
              updatedPerson.phone = enrichedInfo.phone_number;
            }
            
            // Replace the person in the array with updated version
            enrichedPersons[i] = updatedPerson;
          } else {
            console.log(`⚠️ [Executive Enrichment] No enriched data found for ${person.name}`);
          }
        } else {
          console.log(`⚠️ [Executive Enrichment] No ID available for ${person.name}, can't enrich`);
        }
      }
    }
    
    // Log final enrichment results
    console.log(`✅ [Executive Enrichment] Completed enrichment for all executives`);
    for (const person of enrichedPersons) {
      console.log(`📊 [Executive Enrichment] ${person.name} (${person.position}): Email: ${person.email || 'none'}, Phone: ${person.phone || 'none'}`);
    }
    
    return enrichedPersons;
  }

  // Function to enrich person data with contact information (email and phone)
  async function enrichPersonContactInfo(personId: string) {
    console.log(`🔍 [Person Enrichment] Starting enrichment for person ID: ${personId}`);
    
    try {
      // Call our API endpoint to get enriched contact information
      const apiUrl = "/api/apollo";
      console.log(`🔍 [Person Enrichment] Calling Apollo API endpoint`);
      
      const requestBody = {
        action: "enrichPerson",
        personId: personId,
      };
      console.log(`🔍 [Person Enrichment] Request payload:`, requestBody);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      // Log response status
      console.log(`🔍 [Person Enrichment] API response status: ${response.status}`);
      
      // Handle response errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ [Person Enrichment] API error: status ${response.status}`,
          errorText
        );
        return null;
      }
      
      // Parse response data
      const data = await response.json();
      console.log(`✅ [Person Enrichment] API response received:`, data);
      
      if (!data.person) {
        console.log(`ℹ️ [Person Enrichment] No enriched data found for person ID: ${personId}`);
        return null;
      }
      
      // Log the full person data for debugging
      console.log(`🔎 [Person Enrichment] Received person data:`, JSON.stringify(data.person).substring(0, 300) + '...');
      
      // Extract the relevant contact information
      const enrichedInfo = {
        email: data.person.email || null,
        phone_number: null as string | null,
      };
      
      // Check if there's contact information in the response
      if (data.person.contact && data.person.contact.phone_number) {
        enrichedInfo.phone_number = data.person.contact.phone_number;
      } else if (data.person.phone) {
        enrichedInfo.phone_number = data.person.phone;
      } else if (data.person.sanitized_phone) {
        enrichedInfo.phone_number = data.person.sanitized_phone;
      }
      
      // Log what we found
      console.log(`✅ [Person Enrichment] Extracted email: ${enrichedInfo.email || 'none'}`);
      console.log(`✅ [Person Enrichment] Extracted phone: ${enrichedInfo.phone_number || 'none'}`);
      
      if (!enrichedInfo.email || !enrichedInfo.phone_number) {
        console.log(`⚠️ [Person Enrichment] Incomplete contact info for ${personId}`);
      }
      
      return enrichedInfo;
    } catch (error) {
      console.error(`❌ [Person Enrichment] Error enriching person data:`, error);
      return null;
    }
  }

  async function saveSelectedLeads() {
    console.log(
      `💾 [Save Leads] Starting save process for ${selectedLeads.length} leads`
    );

    try {
      setIsSaving(true);

      // Get the selected lead objects from the leads array
      const leadsToSave = leads.filter((lead) =>
        selectedLeads.includes(lead.id)
      );
      console.log(
        `💾 [Save Leads] Filtered ${leadsToSave.length} leads to save`
      );

      // First save all leads to database, then trigger analysis in background
      const savedAccounts = [];

      // Save each selected lead to Supabase
      for (const lead of leadsToSave) {
        console.log(`💾 [Save Leads] Processing lead: ${lead.name}`);

        // Extract domain from website for Apollo API search
        const domain = lead.website
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0];

        // 1. Get initial key persons and BuiltWith data
        console.log(`💾 [Save Leads] Fetching key persons and tech data for ${domain}`);
        const { keyPersons: initialPersons, builtWithData } = await fetchKeyPersons(domain);
        
        // Extract CEO and CFO IDs and emails from the key persons
        let ceoId = null;
        let ceoEmail = null;
        let cfoId = null;
        let cfoEmail = null;
        
        // Find CEO and CFO
        for (const person of initialPersons) {
          if (person.position === "CEO") {
            ceoId = person.id || null;
            ceoEmail = person.email || null;
            console.log(`💾 [Save Leads] Found CEO: ${person.name}, ID: ${ceoId}, Initial Email: ${ceoEmail || 'none'}`);
          } else if (person.position === "CFO") {
            cfoId = person.id || null;
            cfoEmail = person.email || null;
            console.log(`💾 [Save Leads] Found CFO: ${person.name}, ID: ${cfoId}, Initial Email: ${cfoEmail || 'none'}`);
          }
        }
        
        // Directly enrich CEO email information if we have ID
        if (ceoId) {
          console.log(`💾 [Save Leads] Directly enriching CEO contact info with ID: ${ceoId}`);
          try {
            const enrichedCEO = await enrichPersonContactInfo(ceoId);
            if (enrichedCEO && enrichedCEO.email) {
              ceoEmail = enrichedCEO.email;
              console.log(`💾 [Save Leads] Successfully enriched CEO Email: ${ceoEmail}`);
            }
          } catch (error) {
            console.error(`❌ [Save Leads] Error enriching CEO data:`, error);
          }
        }
        
        // Directly enrich CFO email information if we have ID
        if (cfoId) {
          console.log(`💾 [Save Leads] Directly enriching CFO contact info with ID: ${cfoId}`);
          try {
            const enrichedCFO = await enrichPersonContactInfo(cfoId);
            if (enrichedCFO && enrichedCFO.email) {
              cfoEmail = enrichedCFO.email;
              console.log(`💾 [Save Leads] Successfully enriched CFO Email: ${cfoEmail}`);
            }
          } catch (error) {
            console.error(`❌ [Save Leads] Error enriching CFO data:`, error);
          }
        }
        
        // 2. Enrich all executives with contact information before saving to database
        console.log(`💾 [Save Leads] Enriching executive contact information`);
        const enrichedPersons = await enrichExecutiveContactInfo(initialPersons as KeyPerson[]);
        
        console.log(`💾 [Save Leads] BuiltWith data:`, builtWithData);

        // Create a combined JSON structure for key_persons with enriched data
        const keyPersonsData = {
          company_info: formatKeyPersons(lead),
          people: enrichedPersons,
        };
        
        // Process ecommerce providers
        let ecommProviders: string[] = [];
        if (builtWithData.ecomm_provider) {
          // Split by comma and clean up each item
          ecommProviders = builtWithData.ecomm_provider
            .split(',')
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
          console.log(`💾 [Save Leads] Extracted ecommerce providers:`, ecommProviders);
        }
        
        // Process payment processors
        let paymentProcessors: string[] = [];
        if (builtWithData.psp_or_card_processor) {
          // Split by comma and clean up each item
          paymentProcessors = builtWithData.psp_or_card_processor
            .split(',')
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
          console.log(`💾 [Save Leads] Extracted payment processors:`, paymentProcessors);
        }

        // Save with fully enriched data
        const accountData = {
          name: lead.name,
          website: lead.website,
          crn: currentCRN ? parseInt(currentCRN, 10) || 0 : 0, // Use current CRN if available
          b2borb2c: "b2b" as "b2b" | "b2c", // Properly typed as union literal
          company_offering: "", // Empty string to trigger skeleton loader
          sales_channels: "", // Empty string for description, will be populated during analysis
          is_online_checkout_present: false, // Default, will be updated after analysis
          ecomm_provider: ecommProviders,
          psp_or_card_processor: paymentProcessors,
          key_persons: JSON.stringify(keyPersonsData), // Store as JSON string with enriched data
          logo_url: lead.icon !== "/logos/default.svg" ? lead.icon : null,
          // Add CEO and CFO information directly in the database
          ceo_id: ceoId,
          ceo_email: ceoEmail,
          cfo_id: cfoId,
          cfo_email: cfoEmail
        };

        console.log(
          `💾 [Save Leads] Saving fully enriched account data for ${lead.name}${currentCRN ? ` with CRN: ${currentCRN}` : ''}...`
        );
        // @ts-expect-error - Type mismatch between Supabase types and our application types
        const savedAccount = await createAccount(accountData);
        console.log(
          `✅ [Save Leads] Successfully saved account: ${lead.name} with ID: ${savedAccount.id}`
        );
        console.log(
          `✅ [Save Leads] Saved executive info - CEO Email: ${ceoEmail || 'none'}, CFO Email: ${cfoEmail || 'none'}`
        );

        // Store saved account data for background processing
        savedAccounts.push({
          id: savedAccount.id,
          lead: lead,
          account: savedAccount,
        });
      }

      // Close modal and reset form
      console.log(`✅ [Save Leads] All leads saved, resetting form`);
      reset();
      resetCRN();
      setCurrentCRN(null); // Reset current CRN after saving
      setIsOpen(false);
      setLeads([]);
      setSelectedLeads([]);
      onSuccess();

      // Now trigger background analysis for all saved accounts
      console.log(
        `🔄 [Background Analysis] Starting background analysis for ${savedAccounts.length} accounts`
      );
      backgroundAnalyzeWebsites(savedAccounts);
    } catch (error) {
      console.error(`❌ [Save Leads] Error saving leads:`, error);
      setError("Failed to save leads. Please try again.");
    } finally {
      console.log(
        `🔄 [Save Leads] Save process complete, resetting saving state`
      );
      setIsSaving(false);
    }
  }

  // New function to handle background analysis
  async function backgroundAnalyzeWebsites(
    savedAccounts: Array<{
      id: string;
      lead: CompanyLead;
      account: Database["public"]["Tables"]["accounts"]["Row"];
    }>
  ) {
    console.log(
      `🧠 [Background Analysis] Processing ${savedAccounts.length} accounts in background`
    );

    // Track accounts being analyzed for UI updates
    const analyzingAccountIds = savedAccounts.map((saved) => saved.id);

    // Update the store to mark these accounts as being analyzed
    startAnalyzing(analyzingAccountIds);
    console.log(
      `🧠 [Background Analysis] Started skeleton loading for: ${analyzingAccountIds}`
    );

    for (const saved of savedAccounts) {
      try {
        console.log(
          `🧠 [Background Analysis] Analyzing website for account: ${saved.account.name} (ID: ${saved.id})`
        );
        const websiteURL = saved.lead.website.replace(/^https?:\/\//, "");

        // Analyze the website using our updated service that now calls the API endpoint
        console.log(
          `🧠 [Background Analysis] Starting analysis for ${websiteURL} with account ID: ${saved.id}`
        );
        const analysis = await analyzeWebsite(websiteURL, saved.id);
        console.log(
          `✅ [Background Analysis] Analysis complete for ${saved.account.name}`,
          analysis
        );

        // Determine business model
        let b2borb2c: "b2b" | "b2c" = "b2b"; // Default
        if (analysis.business_model) {
          if (analysis.business_model.toLowerCase() === "b2c") {
            b2borb2c = "b2c";
          } else if (analysis.business_model.toLowerCase() === "b2b") {
            b2borb2c = "b2b";
          }
        }
        
        console.log(
          `💾 [Background Analysis] Determined business model: ${b2borb2c}`
        );

        // Determine online checkout presence
        const hasOnlineCheckout = analysis.has_online_checkout === "Yes";
        console.log(
          `💾 [Background Analysis] Has online checkout: ${hasOnlineCheckout}`
        );

        // Format products and services
        const productsServices =
          analysis.products_and_services
            ?.filter((p) => p !== "unknown")
            .join(", ") || "";
        console.log(
          `💾 [Background Analysis] Products/Services: ${
            productsServices || "None specified"
          }`
        );

        // Get the existing ecommerce provider data from the account
        // Only update from the analysis if we don't already have data from BuiltWith
        const existingEcommProviders = saved.account.ecomm_provider || [];
        
        // Prepare ecommerce provider array
        const ecommProvider: string[] = [...existingEcommProviders]; // Start with existing data
        
        // Only add from the analysis if we don't already have data from BuiltWith
        if (ecommProvider.length === 0 && 
            analysis.ecommerce_platform && 
            analysis.ecommerce_platform !== "unknown") {
          ecommProvider.push(analysis.ecommerce_platform.toLowerCase());
        }
        
        console.log(
          `💾 [Background Analysis] E-commerce providers:`,
          ecommProvider
        );

        // Get the existing payment processor data from the account
        const existingPspProcessor = saved.account.psp_or_card_processor || [];
        
        // Prepare payment processor array
        const pspProcessor: string[] = [...existingPspProcessor]; // Start with existing data
        
        // Only add from the analysis if we don't already have data from BuiltWith
        if (pspProcessor.length === 0 &&
            analysis.payment_service_provider && 
            analysis.payment_service_provider !== "unknown") {
          pspProcessor.push(analysis.payment_service_provider.toLowerCase());
        }
        
        console.log(
          `💾 [Background Analysis] Payment processors:`,
          pspProcessor
        );

        // Update the account with the analyzed data
        console.log(
          `💾 [Background Analysis] Updating account ${saved.id} with analyzed data`
        );
        console.log(
          `💾 [Background Analysis] Sales channels analysis: ${analysis.salesChannelsAnalysis || 'Not available'}`
        );
        await updateAccount(saved.id, {
          b2borb2c,
          is_online_checkout_present: hasOnlineCheckout,
          company_offering: productsServices,
          sales_channels: analysis.short_description || "",
          sales_channel_perplexity: analysis.salesChannelsAnalysis || "",
          ecomm_provider: ecommProvider,
          psp_or_card_processor: pspProcessor,
        });

        console.log(
          `✅ [Background Analysis] Successfully updated account: ${saved.account.name}`
        );
      } catch (error) {
        console.error(
          `❌ [Background Analysis] Error processing account ${saved.id}:`,
          error
        );
      } finally {
        // Mark this account as no longer being analyzed
        stopAnalyzing([saved.id]);
        console.log(
          `🔄 [Background Analysis] Finished analysis for account ${saved.id}`
        );
      }
    }

    console.log(`✅ [Background Analysis] All accounts processed`);
  }

  // Helper function to format key persons field
  function formatKeyPersons(lead: CompanyLead): string {
    const parts = [];

    if (lead.founded_year) {
      parts.push(`Founded: ${lead.founded_year}`);
    }

    parts.push(`Headcount: ${lead.headcount}`);

    if (lead.alexa_ranking) {
      parts.push(`Alexa Ranking: ${lead.alexa_ranking.toLocaleString()}`);
    }

    if (lead.publicly_traded && lead.publicly_traded.symbol) {
      parts.push(
        `Stock: ${lead.publicly_traded.symbol} (${
          lead.publicly_traded.exchange?.toUpperCase() || "Unknown"
        })`
      );
    }

    return parts.join(", ");
  }

  // Format the website URL for display
  function formatWebsite(url: string): string {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  // Function to handle CRN search form submission
  async function onCRNSearch(data: CRNSearchValues) {
    console.log(`🔍 [CRN Search] Search initiated for CRN: ${data.crn}`);

    try {
      setIsCRNLoading(true);
      setError(null);
      
      // Clear any previously set CRN
      setCurrentCRN(null);
      
      // Search for company by CRN using Companies House API via server action
      console.log(`🔍 [CRN Search] Calling server action for CRN: ${data.crn}`);
      const result = await fetchCompanyByCRN(data.crn);
      
      if (!result.companyName) {
        console.log(`❌ [CRN Search] No company found with CRN: ${data.crn}`);
        setError(result.error || `No company found with CRN: ${data.crn}`);
        setIsCRNLoading(false);
        return;
      }
      
      // Store the CRN for later use when saving the account
      setCurrentCRN(data.crn);
      console.log(`✅ [CRN Search] Found company name: ${result.companyName} with CRN: ${data.crn}`);
      
      // Use the company name to search for leads with Apollo API
      console.log(`🔍 [CRN Search] Searching for leads with company name: ${result.companyName}`);
      const results = await searchLeads(result.companyName);
      
      console.log(`✅ [CRN Search] Search complete, found ${results.length} results`);

      if (results.length === 0) {
        console.log(`ℹ️ [CRN Search] No results found`);
        setError(`No leads found for company: ${result.companyName}`);
        setCurrentCRN(null); // Reset CRN if no leads found
      }

      setLeads(results);
      setSelectedLeads([]);
      
      // Reset CRN form
      resetCRN();
    } catch (error) {
      console.error(`❌ [CRN Search] Error during search:`, error);
      setError("Failed to search for company. Please try again.");
      setCurrentCRN(null); // Reset CRN on error
    } finally {
      console.log(`🔄 [CRN Search] Search process complete, resetting loading state`);
      setIsCRNLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find Company Leads</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Website Search Form */}
          <form onSubmit={handleSubmit(onSearch)} className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Enter website or type company name "
                {...register("website")}
                aria-invalid={!!errors.website}
              />
              {errors.website && (
                <p className="text-destructive text-xs mt-1">
                  {errors.website.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </form>

          {/* CRN Search Form */}
          <form onSubmit={handleSubmitCRN(onCRNSearch)} className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Enter company registration number (CRN)"
                {...registerCRN("crn")}
                aria-invalid={!!crnErrors.crn}
              />
              {crnErrors.crn && (
                <p className="text-destructive text-xs mt-1">
                  {crnErrors.crn.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isCRNLoading}>
              {isCRNLoading ? "Searching..." : "Search by CRN"}
            </Button>
          </form>

          {/* Error Message */}
          {error && <p className="text-destructive text-sm">{error}</p>}

          {/* Results Table */}
          {leads.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">
                  Found {leads.length} companies. Select the ones you want to
                  save as leads.
                </p>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-16">Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="p-2">
                          <Checkbox
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="relative h-12 w-12 overflow-hidden rounded-sm">
                            <Image
                              src={lead.icon}
                              alt={lead.name}
                              fill
                              className="object-contain"
                              onError={(e) => {
                                // Fallback to default icon if the image fails to load
                                (e.target as HTMLImageElement).src =
                                  "/logos/default.svg";
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {lead.founded_year
                                ? `Founded: ${lead.founded_year}`
                                : ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {formatWebsite(lead.website)}
                          </a>
                        </TableCell>
                        <TableCell>
                          {lead.linkedin_url ? (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <svg
                                className="h-4 w-4 mr-1"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                              </svg>
                              View Profile
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not available
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Save Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={saveSelectedLeads}
                  disabled={selectedLeads.length === 0 || isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : `Save ${selectedLeads.length} Lead${
                        selectedLeads.length !== 1 ? "s" : ""
                      }`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

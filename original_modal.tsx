"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles, Trash, Linkedin, Mail, Phone } from "lucide-react";
import Image from "next/image";
import { deleteAccount } from "@/lib/supabase/client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define the Account type inline to avoid import issues
type Account = {
  id: string;
  created_at: string;
  name: string;
  website: string;
  crn: number;
  b2borb2c: "b2b" | "b2c";
  company_offering: string;
  sales_channels: string;
  is_online_checkout_present: boolean;
  ecomm_provider: string[];
  psp_or_card_processor: string[];
  key_persons: string;
  logo_url?: string | null;
  sales_channel_perplexity?: string;
};

// Extend the Account type to add the logo_url property
type ContactPerson = {
  name: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  position?: string;
};

interface CompanyDetailsModalProps {
  company: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const logoMap: Record<string, string> = {
  shopify: "/logos/shopify.svg",
  woocommerce: "/logos/woocommerce.svg",
  magento: "/logos/magento.svg",
  stripe: "/logos/stripe.svg",
  paypal: "/logos/paypal.svg",
  adyen: "/logos/adyen.svg",
  worldpay: "/logos/worldpay.svg",
  square: "/logos/square.svg",
  "authorize.net": "/logos/authorize.svg",
  custom: "/logos/custom.svg",
  klarna: "/logos/klarna.svg",
  gpay: "/logos/gpay.svg",
  "google pay": "/logos/gpay.svg",
};

// Popular eCommerce providers to prioritize in sorting
const popularEcommProviders = [
  /shopify/i,
  /woocommerce/i,
  /magento/i,
  /bigcommerce/i,
  /wix/i,
  /squarespace/i,
  /prestashop/i,
  /opencart/i,
  /salesforce/i,
  /adobe commerce/i
];

// Popular payment processors to prioritize in sorting
const popularPaymentProcessors = [
  /stripe/i,
  /paypal/i,
  /adyen/i,
  /worldpay/i,
  /square/i,
  /authorize\.net/i,
  /braintree/i,
  /checkout\.com/i,
  /klarna/i,
  /affirm/i
];

// Function to sort providers by popularity
const sortByPopularity = (items: string[], popularPatterns: RegExp[]): string[] => {
  if (!items || !items.length) return [];
  
  // Remove duplicates by converting to Set and back to array
  const uniqueItems = [...new Set(items.map(item => item.toLowerCase()))];
  
  return uniqueItems.sort((a, b) => {
    const aIndex = popularPatterns.findIndex(pattern => pattern.test(a));
    const bIndex = popularPatterns.findIndex(pattern => pattern.test(b));
    
    // If both match patterns, sort by pattern order
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    // If only a matches a pattern, prioritize a
    if (aIndex !== -1) return -1;
    // If only b matches a pattern, prioritize b
    if (bIndex !== -1) return 1;
    // If neither matches, maintain original order
    return 0;
  });
};

export default function CompanyDetailsModal({
  company,
  isOpen,
  onClose,
  onSuccess,
}: CompanyDetailsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!company) return null;

  // Parse key persons string into structured data
  const parseKeyPersons = (keyPersonsString: string): ContactPerson[] => {
    // Try to parse as JSON first
    try {
      // Try to parse as JSON
      const data = JSON.parse(keyPersonsString);
      
      // If it has a people array with data from Apollo API, use that
      if (data && data.people && Array.isArray(data.people)) {
        return data.people.map((person: any) => ({
          name: person.name,
          title: person.title,
          email: person.email,
          phone: person.phone,
          linkedin: person.linkedin,
          position: person.position
        }));
      }
      
      // Fall back to the old string parsing logic
      const parts = keyPersonsString.split(',').map(part => part.trim()).filter(Boolean);
      const contactPersons: ContactPerson[] = [];
      
      // If the string is just company info (founded, headcount), skip it
      if (
        parts.every(part => 
          part.startsWith('Founded:') || 
          part.startsWith('Headcount:') || 
          part.startsWith('Alexa Ranking:')
        )
      ) {
        return [];
      }
      
      // Extract name and title from patterns like "John Doe (CEO)"
      for (const part of parts) {
        if (part.includes('(') && part.includes(')')) {
          const nameTitleMatch = part.match(/([^(]+)\s*\(([^)]+)\)/);
          if (nameTitleMatch) {
            const [_, name, title] = nameTitleMatch;
            contactPersons.push({
              name: name.trim(),
              title: title.trim(),
              email: `contact@${company.website}`,
              linkedin: company.website ? `https://linkedin.com/company/${company.website.split('.')[0]}` : undefined
            });
          }
        }
      }
      
      // If we couldn't extract structured data, create a default contact
      if (contactPersons.length === 0 && parts.length > 0) {
        // Just use the whole string as name if it doesn't fit our pattern
        contactPersons.push({
          name: parts[0].replace(/\(.*?\)/g, '').trim(),
          title: "Key Contact",
          email: `contact@${company.website}`,
          linkedin: company.website ? `https://linkedin.com/company/${company.website.split('.')[0]}` : undefined
        });
      }
      
      return contactPersons;
    } catch (error) {
      console.error("Error parsing key persons:", error);
      
      // If JSON parsing failed, try the old string parsing logic
      try {
        const parts = keyPersonsString.split(',').map(part => part.trim()).filter(Boolean);
        const contactPersons: ContactPerson[] = [];
        
        // If the string is just company info (founded, headcount), skip it
        if (
          parts.every(part => 
            part.startsWith('Founded:') || 
            part.startsWith('Headcount:') || 
            part.startsWith('Alexa Ranking:')
          )
        ) {
          return [];
        }
        
        // Extract name and title from patterns like "John Doe (CEO)"
        for (const part of parts) {
          if (part.includes('(') && part.includes(')')) {
            const nameTitleMatch = part.match(/([^(]+)\s*\(([^)]+)\)/);
            if (nameTitleMatch) {
              const [_, name, title] = nameTitleMatch;
              contactPersons.push({
                name: name.trim(),
                title: title.trim(),
                email: `contact@${company.website}`,
                linkedin: company.website ? `https://linkedin.com/company/${company.website.split('.')[0]}` : undefined
              });
            }
          }
        }
        
        // If we couldn't extract structured data, create a default contact
        if (contactPersons.length === 0 && parts.length > 0) {
          // Just use the whole string as name if it doesn't fit our pattern
          contactPersons.push({
            name: parts[0].replace(/\(.*?\)/g, '').trim(),
            title: "Key Contact",
            email: `contact@${company.website}`,
            linkedin: company.website ? `https://linkedin.com/company/${company.website.split('.')[0]}` : undefined
          });
        }
        
        return contactPersons;
      } catch (innerError) {
        console.error("Error in fallback parsing:", innerError);
        return [];
      }
    }
  };

  const keyPersons = parseKeyPersons(company.key_persons);

  // Sort eCommerce providers and payment processors by popularity
  const sortedEcommProviders = sortByPopularity(company.ecomm_provider || [], popularEcommProviders);
  const sortedPaymentProcessors = sortByPopularity(company.psp_or_card_processor || [], popularPaymentProcessors);

  // Function to get logo URL based on provider name
  const getLogoUrl = (provider: string): string => {
    // Check for case-insensitive matches in logoMap
    for (const [key, value] of Object.entries(logoMap)) {
      if (provider.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return "/logos/default.svg";
  };

  const handleDelete = async () => {
    if (!company) return;

    try {
      setIsDeleting(true);
      await deleteAccount(company.id);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                <Image
                  src={company.logo_url || "/logos/default.svg"}
                  alt={company.name}
                  fill
                  className="object-contain"
                />
              </div>
              <DialogTitle className="text-2xl font-bold">{company.name}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                <Trash className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="company" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="mt-4">
            <div className="grid grid-cols-2 gap-6 py-4">
              <div>
                <h3 className="font-medium text-muted-foreground">Company Details</h3>
                <Separator className="my-2" />
                <dl className="space-y-6">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Website</dt>
                    <dd className="flex items-center">
                      <a 
                        href={`https://${company.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center"
                      >
                        {company.website}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Business Type</dt>
                    <dd>
                      <Badge 
                        variant={company.b2borb2c === "b2b" ? "secondary" : "default"} 
                        className="uppercase"
                      >
                        {company.b2borb2c}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center">
                      Company Offering
                      <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                    </dt>
                    <dd>{company.company_offering}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center">
                      Description
                      <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                    </dt>
                    <dd>{company.sales_channels}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Online Checkout
                    </dt>
                    <dd>{company.is_online_checkout_present ? "Yes" : "No"}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="font-medium text-muted-foreground">Technology</h3>
                <Separator className="my-2" />
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center">
                      eCommerce Products
                      <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                    </dt>
                    <dd className="mt-1">
                      {sortedEcommProviders && sortedEcommProviders.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                          {sortedEcommProviders.map((provider) => (
                            <div
                              key={provider}
                              className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1"
                            >
                              <div className="relative h-5 w-5">
                                <Image
                                  src={getLogoUrl(provider)}
                                  alt={provider}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs">{provider}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center">
                      Payment Processors
                      <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                    </dt>
                    <dd className="mt-1">
                      {sortedPaymentProcessors && sortedPaymentProcessors.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                          {sortedPaymentProcessors.map((processor) => (
                            <div
                              key={processor}
                              className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1"
                            >
                              <div className="relative h-5 w-5">
                                <Image
                                  src={getLogoUrl(processor)}
                                  alt={processor}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs">{processor}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center">
                      Sales Channels
                      <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                    </dt>
                    <dd className="mt-1">
                      <span className="text-sm">
                        {company.sales_channel_perplexity?.replace(/\[\d+\]/g, "")}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* Key Persons Section */}
            <div className="mt-4">
              <h3 className="font-medium text-muted-foreground">Key Persons</h3>
              <Separator className="my-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {keyPersons.length > 0 ? (
                  // Remove duplicates by creating a Map with name as key
                  Array.from(
                    new Map(keyPersons.map(person => [person.name, person])).values()
                  ).map((person, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-2">
                          <h4 className="font-semibold">{person.name}</h4>
                          <p className="text-sm text-muted-foreground">{person.title || person.position}</p>
                          
                          <div className="flex flex-col mt-2 space-y-2">
                            {person.email && (
                              <a 
                                href={`mailto:${person.email}`} 
                                className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                {person.email}
                              </a>
                            )}
                            
                            {person.phone && (
                              <a 
                                href={`tel:${person.phone}`} 
                                className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                              >
                                <Phone className="h-4 w-4 mr-1" />
                                {person.phone}
                              </a>
                            )}
                            
                            {person.linkedin && (
                              <a 
                                href={person.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                              >
                                <Linkedin className="h-4 w-4 mr-1" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No key contact information available.</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="employees" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>LinkedIn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keyPersons.length > 0 ? (
                    // Remove duplicates by creating a Map with name as key
                    Array.from(
                      new Map(keyPersons.map(person => [person.name, person])).values()
                    ).map((person, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.title || person.position}</TableCell>
                        <TableCell>
                          {person.email ? (
                            <a 
                              href={`mailto:${person.email}`} 
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              {person.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {person.phone ? (
                            <a 
                              href={`tel:${person.phone}`} 
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              <Phone className="h-4 w-4 mr-1" />
                              {person.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {person.linkedin ? (
                            <a 
                              href={person.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              <Linkedin className="h-4 w-4 mr-1" />
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No employee information available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
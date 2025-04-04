"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { CompanyAnalysisModal } from "@/components/company-analysis-modal";

// Define the CompanyAnalysis type
type CompanyAnalysis = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  logo: string;
  domain: string;
  apollo_id: string;
  linkedin_url: string;
  sales_channels: string;
  short_description: string;
  products_and_services: string[];
  business_model: "B2B" | "B2C" | "Both" | "unknown";
  has_online_checkout: "Yes" | "No" | "unknown";
  ecommerce_platform: string | null;
  payment_service_provider: string | null;
  ceo_name: string | null;
  ceo_email: string | null;
  ceo_phone: string | null;
  ceo_linkedin: string | null;
  cfo_name: string | null;
  cfo_email: string | null;
  cfo_phone: string | null;
  cfo_linkedin: string | null;
};

export default function UseCase1Page() {
  const [inputValue, setInputValue] = useState("");
  const [companies, setCompanies] = useState<CompanyAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createClientComponentClient();

  // Fetch company analyses data on page load
  useEffect(() => {
    fetchCompanyAnalyses();
  }, []);

  async function fetchCompanyAnalyses() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_analyses")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching company analyses:", error);
        setError("Failed to fetch company data");
      } else {
        setCompanies(data || []);
        setError(null);
      }
    } catch (err) {
      console.error("Exception fetching company analyses:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!inputValue.trim()) {
      setError("Please enter a CRN or company website");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/one", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyIdentifier: inputValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze company");
      }

      // Refresh the company analyses data after successful submission
      await fetchCompanyAnalyses();

      // Clear the input field after successful submission
      setInputValue("");
    } catch (err) {
      console.error("Error submitting request:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process request"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Function to handle row click and show company details modal
  const handleRowClick = (company: CompanyAnalysis) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  // Function to close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
    // Refresh the list after modal is closed in case of deletions
    fetchCompanyAnalyses();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Company Analysis</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="CRN or company website"
          className="max-w-sm"
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </form>

      {error && <div className="text-destructive text-sm">{error}</div>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Offering</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Online Checkout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading company data...
                </TableCell>
              </TableRow>
            ) : companies.length > 0 ? (
              companies.map((company) => (
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(company)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {company.logo && (
                        <div className="relative h-8 w-8 flex-shrink-0">
                          <Image
                            src={company.logo}
                            alt={`${company.name} logo`}
                            className="rounded-sm object-contain"
                            fill
                            sizes="32px"
                          />
                        </div>
                      )}
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {company.domain && (
                      <a
                        href={`http://${company.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the link
                      >
                        {company.domain}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="max-w-sm">
                    {company.short_description}
                  </TableCell>
                  <TableCell>
                    {company.products_and_services?.join(", ") || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        company.business_model === "B2B"
                          ? "secondary"
                          : "default"
                      }
                      className="uppercase"
                    >
                      {company.business_model}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {company.has_online_checkout === "Yes" && (
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No company data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Company Analysis Modal */}
      {selectedCompany && (
        <CompanyAnalysisModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          company={selectedCompany}
        />
      )}
    </div>
  );
}

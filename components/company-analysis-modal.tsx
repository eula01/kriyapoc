import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash, ExternalLink, Mail, Linkedin, Phone, Sparkles } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Define the CompanyAnalysis type based on data in the database
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

interface CompanyAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAnalysis;
}

export function CompanyAnalysisModal({
  isOpen,
  onClose,
  company,
}: CompanyAnalysisModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const supabase = createClientComponentClient();

  // Function to handle company deletion
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this company analysis?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("company_analyses")
        .delete()
        .eq("id", company.id);

      if (error) {
        console.error("Error deleting company:", error);
        alert("Failed to delete company: " + error.message);
      } else {
        onClose();
        // Force refresh to update the list
        window.location.reload();
      }
    } catch (err) {
      console.error("Exception deleting company:", err);
      alert("An error occurred while deleting the company");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to get appropriate payment logos
  const getLogoUrl = (name: string) => {
    // Normalize the name to lowercase and remove spaces
    const normalizedName = name.toLowerCase().replace(/\s+/g, "");
    
    // Define common payment processors and e-commerce platforms
    const knownLogos: Record<string, string> = {
      // Payment processors
      stripe: "/logos/stripe.svg",
      paypal: "/logos/paypal.svg",
      klarna: "/logos/klarna.svg",
      googlepay: "/logos/google-pay.svg",
      amazonpayments: "/logos/amazon-pay.svg",
      applepay: "/logos/apple-pay.svg",
      
      // E-commerce platforms
      shopify: "/logos/shopify.svg",
      woocommerce: "/logos/woocommerce.svg",
      magento: "/logos/magento.svg",
      bigcommerce: "/logos/bigcommerce.svg",
      prestashop: "/logos/prestashop.svg",
    };
    
    return knownLogos[normalizedName] || "/logos/default.svg";
  };

  // Process payment service providers if available
  const paymentProcessors = company.payment_service_provider
    ? typeof company.payment_service_provider === 'string'
      ? [company.payment_service_provider]
      : Array.isArray(company.payment_service_provider)
        ? (company.payment_service_provider as string[]).filter(Boolean)
        : []
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                <Image
                  src={company.logo || "/logos/default.svg"}
                  alt={company.name}
                  fill
                  className="object-contain"
                />
              </div>
              <DialogTitle className="text-2xl font-bold">
                {company.name}
              </DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div>
            <h3 className="font-medium text-muted-foreground">
              Company Details
            </h3>
            <Separator className="my-2" />
            <dl className="space-y-6">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Website
                </dt>
                <dd className="flex items-center">
                  {company.domain && (
                    <a
                      href={`https://${company.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center"
                    >
                      {company.domain}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Business Type
                </dt>
                <dd>
                  <Badge
                    variant={
                      company.business_model?.toLowerCase() === "b2b" ? "secondary" : "default"
                    }
                    className="uppercase"
                  >
                    {company.business_model || "Unknown"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                  Products & Services
                  <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                </dt>
                <dd>{Array.isArray(company.products_and_services) ? company.products_and_services.join(", ") : "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                  Description
                  <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                </dt>
                <dd>{company.short_description || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Has Online Checkout?
                </dt>
                <dd>{company.has_online_checkout}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="font-medium text-muted-foreground">
              Technology
            </h3>
            <Separator className="my-2" />
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                  eCommerce Platform
                  <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                </dt>
                <dd className="mt-1">
                  {company.ecommerce_platform ? (
                    <div className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 w-fit">
                      <div className="relative h-5 w-5">
                        <Image
                          src={getLogoUrl(company.ecommerce_platform)}
                          alt={company.ecommerce_platform}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="text-xs">{company.ecommerce_platform}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      None
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                  Payment Processor
                  <Sparkles className="h-3 w-3 ml-1 text-yellow-400" />
                </dt>
                <dd className="mt-1">
                  {paymentProcessors.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                      {paymentProcessors.map((processor, index) => (
                        <div
                          key={index}
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
                    <span className="text-muted-foreground text-sm">
                      None
                    </span>
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
                    {company.sales_channels || "N/A"}
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
            {/* CEO Card */}
            {company.ceo_name && (
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-2">
                    <h4 className="font-semibold">{company.ceo_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      CEO / Chief Executive Officer
                    </p>

                    <div className="flex flex-col mt-2 space-y-2">
                      {company.ceo_email && (
                        <a
                          href={`mailto:${company.ceo_email}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          {company.ceo_email}
                        </a>
                      )}

                      {company.ceo_phone && (
                        <a
                          href={`tel:${company.ceo_phone}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          {company.ceo_phone}
                        </a>
                      )}

                      {company.ceo_linkedin && (
                        <a
                          href={company.ceo_linkedin}
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
            )}

            {/* CFO Card */}
            {company.cfo_name && (
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-2">
                    <h4 className="font-semibold">{company.cfo_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      CFO / Chief Financial Officer
                    </p>

                    <div className="flex flex-col mt-2 space-y-2">
                      {company.cfo_email && (
                        <a
                          href={`mailto:${company.cfo_email}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          {company.cfo_email}
                        </a>
                      )}

                      {company.cfo_phone && (
                        <a
                          href={`tel:${company.cfo_phone}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          {company.cfo_phone}
                        </a>
                      )}

                      {company.cfo_linkedin && (
                        <a
                          href={company.cfo_linkedin}
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
            )}

            {!company.ceo_name && !company.cfo_name && (
              <p className="text-sm text-muted-foreground col-span-2">
                No key contact information available.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
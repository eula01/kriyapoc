"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ExternalLink, Sparkles, XCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountsStore } from "@/lib/store/accounts-store";

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
};

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
};

export const columns: ColumnDef<Account>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "website",
    header: "Website",
    cell: ({ row }) => {
      const website = row.getValue("website") as string;
      return (
        <a
          href={`https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-500 hover:underline"
        >
          {website}
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      );
    },
  },
  {
    accessorKey: "crn",
    header: "Description",
    cell: ({ row }) => {
      const { isAccountBeingAnalyzed } = useAccountsStore();
      const id = row.original.id;
      // We're storing the description in the sales_channels field
      const description = row.original.sales_channels;
      
      if (isAccountBeingAnalyzed(id)) {
        return (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
          </div>
        );
      }
      
      return description ? (
        <span>{description}</span>
      ) : (
        <span className="text-muted-foreground">No description available</span>
      );
    },
  },
  {
    accessorKey: "company_offering",
    header: () => (
      <div className="flex items-center">
        <span>Offering</span>
      </div>
    ),
    cell: ({ row }) => {
      const { isAccountBeingAnalyzed } = useAccountsStore();
      const id = row.original.id;
      const offering = row.getValue("company_offering") as string;
      
      if (isAccountBeingAnalyzed(id)) {
        return (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        );
      }
      
      return offering || <span className="text-muted-foreground">No information available</span>;
    },
  },
  {
    accessorKey: "b2borb2c",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("b2borb2c") as "b2b" | "b2c";
      return (
        <Badge
          variant={type === "b2b" ? "secondary" : "default"}
          className="uppercase"
        >
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "is_online_checkout_present",
    header: "Online Checkout",
    cell: ({ row }) => {
      const isPresent = row.getValue("is_online_checkout_present") as boolean;

      return isPresent ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    },
  },
  // {
  //   accessorKey: "ecomm_provider",
  //   header: () => <span>eCommerce Provider</span>,
  //   cell: ({ row }) => {
  //     const providers = row.getValue("ecomm_provider") as string[];

  //     if (!providers || !providers.length) {
  //       return <span className="text-muted-foreground">None</span>;
  //     }

  //     return (
  //       <div className="flex gap-1">
  //         {providers.map((provider) => (
  //           <div
  //             key={provider}
  //             className="relative h-6 w-6 tooltip"
  //             data-tip={provider}
  //           >
  //             <Image
  //               src={logoMap[provider] || "/logos/default.svg"}
  //               alt={provider}
  //               fill
  //               className="object-contain"
  //             />
  //           </div>
  //         ))}
  //       </div>
  //     );
  //   },
  // },
  // {
  //   accessorKey: "psp_or_card_processor",
  //   header: () => <span>Payment Processors</span>,
  //   cell: ({ row }) => {
  //     const processors = row.getValue("psp_or_card_processor") as string[];

  //     if (!processors || !processors.length) {
  //       return <span className="text-muted-foreground">None</span>;
  //     }

  //     return (
  //       <div className="flex gap-1">
  //         {processors.map((processor) => (
  //           <div
  //             key={processor}
  //             className="relative h-6 w-6 tooltip"
  //             data-tip={processor}
  //           >
  //             <Image
  //               src={logoMap[processor] || "/logos/default.svg"}
  //               alt={processor}
  //               fill
  //               className="object-contain"
  //             />
  //           </div>
  //         ))}
  //       </div>
  //     );
  //   },
  // }
];

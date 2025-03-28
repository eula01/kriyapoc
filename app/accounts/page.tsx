"use client";

import { useState, useEffect } from "react";
import { columns } from "@/components/columns";
import { DataTable } from "@/components/ui/data-table";
import CompanyDetailsModal from "@/components/company-details-modal";
import AccountForm from "@/components/account-form";
import { supabase } from "@/lib/supabase/client";
import { useAccountsStore } from "@/lib/store/accounts-store";
import { useRouter } from "next/navigation";

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
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { analyzingAccountIds } = useAccountsStore();
  const router = useRouter();

  // Set up real-time subscription and polling refresh
  useEffect(() => {
    // Initial fetch
    fetchAccounts();

    // Set up real-time subscription to accounts table
    const accountsSubscription = supabase
      .channel('accounts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'accounts' }, 
        (payload) => {
          console.log('🔄 [Real-time] Database change detected:', payload);
          fetchAccounts();
          router.refresh();
        }
      )
      .subscribe((status) => {
        console.log(`🔄 [Real-time] Subscription status:`, status);
      });

    // Polling fallback - refresh data every 15 seconds
    // This ensures data is refreshed even if real-time subscription fails
    const pollingInterval = setInterval(() => {
      if (analyzingAccountIds.length > 0) {
        console.log('🔄 [Polling] Refreshing accounts data due to active analysis');
        fetchAccounts();
      }
    }, 15000);

    // Cleanup
    return () => {
      accountsSubscription.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, [analyzingAccountIds, router]);

  async function fetchAccounts() {
    try {
      console.log('📊 [Accounts] Fetching latest accounts data');
      setIsLoading(true);
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      console.log(`📊 [Accounts] Fetched ${data?.length || 0} accounts`);
      setAccounts(data || []);
    } catch (error) {
      console.error("❌ [Accounts] Error fetching accounts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleRowClick = (company: Account) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFormSuccess = () => {
    console.log('🔄 [Accounts] Form success, refreshing accounts data');
    fetchAccounts();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            {analyzingAccountIds.length > 0 && (
              <span className="ml-2 text-blue-500">
                (Analyzing {analyzingAccountIds.length} accounts...)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {/* <button 
            onClick={() => {
              fetchAccounts();
              router.refresh();
            }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Refresh Data
          </button> */}
          <AccountForm onSuccess={handleFormSuccess} />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="name"
          onRowClick={handleRowClick}
        />
      )}
      
      <CompanyDetailsModal
        company={selectedCompany}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
} 
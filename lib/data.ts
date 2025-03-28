export type Company = {
  id: string;
  name: string;
  website: string;
  crn: number;
  b2borb2c: "b2b" | "b2c";
  companyOffering: string;
  salesChannels: string;
  isOnlineCheckoutPresent: boolean;
  eCommProvider: string[];
  pspOrCardProcessor: string[];
  keyPersons: string;
};

export const companies: Company[] = [
  {
    id: "1",
    name: "TechCorp Inc.",
    website: "techcorp.com",
    crn: 12345678,
    b2borb2c: "b2b",
    companyOffering: "Enterprise Software Solutions",
    salesChannels: "Direct Sales, Partner Network",
    isOnlineCheckoutPresent: true,
    eCommProvider: ["shopify", "woocommerce"],
    pspOrCardProcessor: ["stripe", "paypal"],
    keyPersons: "John Doe (CEO), Jane Smith (CTO)"
  },
  {
    id: "2",
    name: "RetailGenius",
    website: "retailgenius.co.uk",
    crn: 87654321,
    b2borb2c: "b2c",
    companyOffering: "Retail Analytics Platform",
    salesChannels: "Online, Retail Partners",
    isOnlineCheckoutPresent: true,
    eCommProvider: ["shopify"],
    pspOrCardProcessor: ["stripe", "adyen"],
    keyPersons: "Alice Johnson (Founder), Bob Williams (COO)"
  },
  {
    id: "3",
    name: "IndustrialSolutions Ltd.",
    website: "industrialsolutions.org",
    crn: 23456789,
    b2borb2c: "b2b",
    companyOffering: "Manufacturing Equipment & Services",
    salesChannels: "Field Sales, Trade Shows",
    isOnlineCheckoutPresent: false,
    eCommProvider: [],
    pspOrCardProcessor: [],
    keyPersons: "Michael Brown (CEO), Sarah Davis (Sales Director)"
  },
  {
    id: "4",
    name: "ConsumerGoods Co.",
    website: "consumergoods.io",
    crn: 34567890,
    b2borb2c: "b2c",
    companyOffering: "Home & Kitchen Products",
    salesChannels: "Online, Retail Stores, Marketplaces",
    isOnlineCheckoutPresent: true,
    eCommProvider: ["woocommerce", "magento"],
    pspOrCardProcessor: ["stripe", "worldpay", "square"],
    keyPersons: "Emily Wilson (CEO), Tom Jackson (Head of Marketing)"
  },
  {
    id: "5",
    name: "HealthTech Innovations",
    website: "healthtech-innovations.com",
    crn: 45678901,
    b2borb2c: "b2b",
    companyOffering: "Healthcare Software & Devices",
    salesChannels: "Direct Sales, Healthcare Events",
    isOnlineCheckoutPresent: true,
    eCommProvider: ["custom"],
    pspOrCardProcessor: ["stripe", "authorize.net"],
    keyPersons: "David Miller (CEO), Rebecca Taylor (Medical Director)"
  }
]; 
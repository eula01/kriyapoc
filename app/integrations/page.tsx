import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoImage } from "@/components/ui/logo-image";
import { SlackIcon } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Hubspot Integration Card */}
        <Card className="overflow-hidden border-2 border-muted hover:border-primary/50 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <LogoImage
                src="/logos/hubspot.png"
                alt="Hubspot Logo"
                className="object-contain"
              />
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                CRM
              </span>
            </div>
            <CardTitle className="mt-2">Hubspot</CardTitle>
            <CardDescription>
              Connect your account to Hubspot CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up a 2 way sync with Hubspot to keep your accounts and leads
              up to date.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 pt-0">
            <Button className="w-full">Connect</Button>
          </CardFooter>
        </Card>

        {/* Slack Integration Card */}
        <Card className="overflow-hidden border-2 border-muted hover:border-primary/50 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SlackIcon className="h-8 w-8" />
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                Communication
              </span>
            </div>
            <CardTitle className="mt-2">Slack</CardTitle>
            <CardDescription>
              Connect your account to Slack workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notify your risk team about new inbound leads directly in your
              Slack channels.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 pt-0">
            <Button className="w-full">Connect</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

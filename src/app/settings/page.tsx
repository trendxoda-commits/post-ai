import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountConnections } from '@/components/settings/account-connections';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-6">
          <AccountConnections />
        </TabsContent>
      </Tabs>
    </div>
  );
}

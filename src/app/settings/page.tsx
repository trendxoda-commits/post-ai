
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountConnections } from '@/components/settings/account-connections';
import { UserProfile } from '@/components/settings/user-profile';
import { ApiKeys } from '@/components/settings/api-keys';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <UserProfile />
        </TabsContent>
        <TabsContent value="accounts" className="mt-6">
          <AccountConnections />
        </TabsContent>
         <TabsContent value="api-keys" className="mt-6">
          <ApiKeys />
        </TabsContent>
      </Tabs>
    </div>
  );
}

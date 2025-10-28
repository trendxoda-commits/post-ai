
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/components/settings/user-profile';
import { ApiKeys } from '@/components/settings/api-keys';
import { AccountConnections } from '@/components/settings/account-connections';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
        
        <TabsContent value="api-keys">
          <ApiKeys />
        </TabsContent>

        <TabsContent value="accounts">
            <AccountConnections />
        </TabsContent>
      </Tabs>
    </div>
  );
}

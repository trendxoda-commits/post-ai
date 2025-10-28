
import { UserProfile } from '@/components/settings/user-profile';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <UserProfile />
    </div>
  );
}

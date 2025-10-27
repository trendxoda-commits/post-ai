import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Trash2 } from 'lucide-react';

export function ApiKeys() {
  const placeholderKeys = [
    { name: 'Instagram Key 1', key: 'IG-••••••••••••-XXXX' },
    { name: 'Facebook Key', key: 'FB-••••••••••••-YYYY' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Manage API keys for Instagram and Facebook Graph APIs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <h3 className="font-medium">Add New API Key</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="key-name">Key Name</Label>
              <Input id="key-name" placeholder="e.g., Personal Instagram" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" placeholder="Paste your API key here" />
            </div>
          </div>
          <Button>Save Key</Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Existing Keys</h3>
          {placeholderKeys.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <KeyRound className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {item.key}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Inbox</h1>
        <p className="text-muted-foreground max-w-2xl">
          This is where your social media comments and messages will appear. This feature is currently under construction.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                <Inbox className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Inbox Under Construction</CardTitle>
            <CardDescription>
                We're building a unified inbox for your social media interactions.
                <br />
                Soon you'll be able to view and reply to comments from here.
            </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

import { HashtagGenerator } from '@/components/content-studio/hashtag-generator';

export default function ContentStudioPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Content Studio</h1>
        <p className="text-muted-foreground max-w-2xl">
          Let our AI help you find trending hashtags to boost your content&apos;s
          reach. Provide some details about your account and recent posts to get
          started.
        </p>
      </div>
      <HashtagGenerator />
    </div>
  );
}

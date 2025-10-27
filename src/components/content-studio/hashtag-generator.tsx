'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2 } from 'lucide-react';
import { generateHashtags } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  accountDescription: z
    .string()
    .min(20, 'Please provide a more detailed description (at least 20 characters).'),
  recentPosts: z
    .string()
    .min(20, 'Please describe some recent posts (at least 20 characters).'),
});

export function HashtagGenerator() {
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountDescription: '',
      recentPosts: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setHashtags([]);
    try {
      const result = await generateHashtags(values);
      setHashtags(result.hashtags);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Hashtags',
        description:
          'There was a problem with the AI service. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Trending Hashtag Suggestions</CardTitle>
            <CardDescription>
              Provide context about your account and content to get relevant hashtag ideas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="accountDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A travel blog focusing on budget-friendly adventures in Southeast Asia. I post high-quality photos and travel tips."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recentPosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recent Post Topics</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Last week I posted about street food in Bangkok, a guide to backpacking in Vietnam, and a photo series of temples in Cambodia."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {hashtags.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Suggested Hashtags:</h3>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-sm px-3 py-1 bg-accent/20 text-accent-foreground hover:bg-accent/30"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Hashtags
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

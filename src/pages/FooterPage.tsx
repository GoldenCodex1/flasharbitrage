import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HomepageNav from "@/components/homepage/HomepageNav";
import HomepageFooter from "@/components/homepage/HomepageFooter";

interface Page {
  title: string;
  content: string;
}

export default function FooterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("footer_pages")
      .select("title, content")
      .eq("slug", slug)
      .eq("is_visible", true)
      .single()
      .then(({ data }) => {
        setPage(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <HomepageNav />
        <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-display font-bold mb-4">Page Not Found</h1>
          <Link to="/" className="text-primary hover:underline">Back to Home</Link>
        </div>
        <HomepageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomepageNav />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-display font-bold mb-8">{page.title}</h1>
        <div
          className="prose prose-invert max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_p]:mb-4 [&_p]:leading-relaxed [&_a]:text-primary [&_br]:block [&_br]:mb-2 whitespace-pre-line [&>p]:whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, '<br/>') }}
        />
      </div>
      <HomepageFooter />
    </div>
  );
}

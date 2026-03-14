import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import HomepageNav from "@/components/homepage/HomepageNav";
import HomepageFooter from "@/components/homepage/HomepageFooter";
import { motion } from "framer-motion";
import { User } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string | null;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, name, role, bio, photo_url")
      .eq("is_visible", true)
      .order("display_order")
      .then(({ data }) => {
        setMembers(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomepageNav />
      <div className="pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-4">Our Team</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Meet the people behind ArbAI who are building the future of automated crypto trading.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-6 animate-pulse">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4" />
                <div className="h-5 bg-muted rounded w-32 mx-auto mb-2" />
                <div className="h-4 bg-muted rounded w-24 mx-auto mb-4" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No team members to display yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border/40 bg-card/50 p-6 text-center hover:border-primary/30 transition-colors"
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-border/40"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <h3 className="font-display font-semibold text-lg">{member.name}</h3>
                <p className="text-sm text-primary mb-3">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <HomepageFooter />
    </div>
  );
}

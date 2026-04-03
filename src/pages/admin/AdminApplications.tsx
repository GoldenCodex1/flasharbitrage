import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Users, CheckCircle, XCircle, Clock, Globe, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

export default function AdminApplications() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<any>(null);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["country-slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("country_slots").select("*").order("country");
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status: string; admin_note?: string }) => {
      const { error } = await supabase.from("applications").update({ status, admin_note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      toast({ title: "Status updated" });
    },
  });

  const [slotCountry, setSlotCountry] = useState("");
  const [slotMax, setSlotMax] = useState("5");

  const upsertSlot = useMutation({
    mutationFn: async () => {
      if (!slotCountry) return;
      const { error } = await supabase.from("country_slots").upsert({ country: slotCountry, max_leaders: parseInt(slotMax) || 5 }, { onConflict: "country" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-slots"] });
      setSlotCountry("");
      toast({ title: "Slot updated" });
    },
  });

  const filtered = apps.filter((a: any) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) && !a.email.toLowerCase().includes(search.toLowerCase()) && !a.country.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { total: apps.length, pending: apps.filter((a: any) => a.status === "pending").length, approved: apps.filter((a: any) => a.status === "approved").length, rejected: apps.filter((a: any) => a.status === "rejected").length };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Applications</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, icon: Users },
          { label: "Pending", value: counts.pending, icon: Clock },
          { label: "Approved", value: counts.approved, icon: CheckCircle },
          { label: "Rejected", value: counts.rejected, icon: XCircle },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="flex items-center gap-3 py-4">
              <s.icon className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="slots">Country Slots</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Search name, email, country..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No applications found</TableCell></TableRow>
                  ) : (
                    filtered.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.full_name}</TableCell>
                        <TableCell className="text-sm">{a.email}</TableCell>
                        <TableCell>{a.country}</TableCell>
                        <TableCell className="capitalize text-sm">{a.selected_role?.replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[a.status] || ""}>{a.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewing(a)}><Eye className="w-4 h-4" /></Button>
                            {a.status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-400" onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="slots" className="space-y-4">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg">Set Country Slot Limit</CardTitle></CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Country name" value={slotCountry} onChange={(e) => setSlotCountry(e.target.value)} className="max-w-xs" />
              <Input type="number" placeholder="Max leaders" value={slotMax} onChange={(e) => setSlotMax(e.target.value)} className="w-32" />
              <Button onClick={() => upsertSlot.mutate()} disabled={!slotCountry}>Save</Button>
            </CardContent>
          </Card>

          {slots.length > 0 && (
            <Card className="border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Max Leaders</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.country}</TableCell>
                      <TableCell>{s.max_leaders}</TableCell>
                      <TableCell>{s.approved_count}</TableCell>
                      <TableCell className={s.approved_count >= s.max_leaders ? "text-destructive" : "text-accent"}>
                        {Math.max(0, s.max_leaders - s.approved_count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              {[
                ["Name", viewing.full_name],
                ["Email", viewing.email],
                ["Phone", viewing.phone],
                ["Country", viewing.country],
                ["City", viewing.city],
                ["Role", viewing.selected_role?.replace(/_/g, " ")],
                ["Experience", viewing.experience],
                ["Network", viewing.network_size],
                ["Motivation", viewing.motivation],
                ["Status", viewing.status],
                ["Applied", new Date(viewing.created_at).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-muted-foreground w-24 shrink-0 capitalize">{k}:</span>
                  <span>{v}</span>
                </div>
              ))}

              {viewing.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => { updateStatus.mutate({ id: viewing.id, status: "approved" }); setViewing(null); }}>Approve</Button>
                  <Button variant="destructive" onClick={() => { updateStatus.mutate({ id: viewing.id, status: "rejected" }); setViewing(null); }}>Reject</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

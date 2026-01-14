import { useMemo, useState } from "react";
import { ArrowLeft, AlertCircle, Plus } from "lucide-react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/auth/AuthProvider";

export function TicketCreateViewV1({
  onBack,
  onCreated,
  defaults,
}: {
  onBack: () => void;
  onCreated: (ticketId: string) => void;
  defaults?: {
    ticket_type?: string;
    channel?: string;
    mailbox?: string;
    category?: string;
    priority?: string;
  };
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaults?.category ?? "General");
  const [priority, setPriority] = useState(defaults?.priority ?? "medium");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      title: trimmedTitle,
      description: description.trim() || null,
      requester_id: user.id,
      created_by: user.id,
      status: "new",
      priority,
      category: category.trim() || "General",
      ...(defaults?.ticket_type ? { ticket_type: defaults.ticket_type } : null),
      ...(defaults?.channel ? { channel: defaults.channel } : null),
      ...(defaults?.mailbox ? { mailbox: defaults.mailbox } : null),
    };

    const { data, error } = await supabase
      .from("tickets")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    const ticketId = data?.id;
    if (!ticketId) {
      setError("Ticket was created but no id was returned.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onCreated(ticketId);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Back"
          >
            <ArrowLeft size={16} className="text-[#2d3e50]" />
          </button>
          <h2 className="text-lg font-semibold text-[#2d3e50]">
            New Ticket
          </h2>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Category</div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Priority</div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="px-3 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-60 flex items-center gap-1"
          >
            <Plus size={14} />
            {submitting ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

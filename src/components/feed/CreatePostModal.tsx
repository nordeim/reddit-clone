import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ImageIcon, Link2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { COMMUNITIES } from "../../data/communities";
import { CURRENT_USER } from "../../data/users";
import { useAppStore } from "../../store/store";
import { cn } from "../../utils/cn";
import type { Post, PostType } from "../../types";

export function CreatePostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [communityId, setCommunityId] = useState(COMMUNITIES[0].id);
  const [type, setType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const addLocalPost = useAppStore((s) => s.addLocalPost);
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();

  const canSubmit = title.trim().length > 3 && (type !== "link" || linkUrl.trim().length > 3);

  function reset() {
    setTitle("");
    setBody("");
    setLinkUrl("");
    setType("text");
  }

  function submit() {
    if (!canSubmit) return;
    const id = `local-${Date.now()}`;
    const post: Post = {
      id,
      communityId,
      authorId: CURRENT_USER.id,
      title: title.trim(),
      type,
      body: type === "text" ? body.trim() || undefined : undefined,
      linkUrl: type === "link" ? linkUrl.trim() : undefined,
      linkDomain: type === "link" ? safeDomain(linkUrl.trim()) : undefined,
      imageCategory: type === "image" ? COMMUNITIES.find((c) => c.id === communityId)?.category : undefined,
      score: 1,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      isLocal: true,
    };
    addLocalPost(post);
    pushToast("Your post has been published", "success");
    reset();
    onClose();
    navigate(`/comments/${id}`);
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Create a post" widthClassName="max-w-xl">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Community</label>
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {COMMUNITIES.map((c) => (
              <option key={c.id} value={c.id}>
                r/{c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {(
            [
              ["text", "Text", FileText],
              ["image", "Image", ImageIcon],
              ["link", "Link", Link2],
            ] as [PostType, string, typeof FileText][]
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-semibold transition-colors",
                type === value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="An interesting title"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {type === "text" && (
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Text <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What do you want to share?"
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        )}

        {type === "link" && (
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">URL</label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        )}

        {type === "image" && (
          <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            A representative image will be attached automatically for this demo.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            Post
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "link";
  }
}

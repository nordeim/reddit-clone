import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ImageIcon, Link2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { COMMUNITIES } from "../../data/communities";
import { CURRENT_USER } from "../../data/users";
import { useAppStore } from "../../store/store";
import { cn } from "../../utils/cn";
import { isSafeUrl, extractDomain } from "../../utils/url";
import type { Post, PostType } from "../../types";

const TITLE_MAX = 300;
const BODY_MAX = 10_000;

export function CreatePostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [communityId, setCommunityId] = useState(COMMUNITIES[0].id);
  const [type, setType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const addLocalPost = useAppStore((s) => s.addLocalPost);
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();

  const trimmedTitle = title.trim();
  const titleError =
    trimmedTitle.length === 0
      ? "Title is required"
      : trimmedTitle.length > TITLE_MAX
        ? `Title must be ${TITLE_MAX} characters or fewer`
        : "";
  const bodyError = body.length > BODY_MAX ? `Body must be ${BODY_MAX} characters or fewer` : "";
  const linkError =
    type !== "link"
      ? ""
      : linkUrl.trim().length === 0
        ? "URL is required for link posts"
        : !isSafeUrl(linkUrl)
          ? "URL must start with http:// or https://"
          : "";

  // We do NOT disable the submit button when there are errors. Disabled
  // buttons are confusing UX (the user can't tell *why* they're disabled)
  // and inaccessible (screen readers announce "disabled" without context).
  // Instead we always allow the click; `submit()` blocks execution and
  // surfaces the error messages via `setShowErrors(true)`.
  const canSubmit = !titleError && !bodyError && !linkError;
  // Auto-show URL errors as the user types, so they get immediate feedback
  // without having to click Submit first.
  const showLinkError = type === "link" && linkUrl.trim().length > 0 && !!linkError;

  function reset() {
    setTitle("");
    setBody("");
    setLinkUrl("");
    setType("text");
    setShowErrors(false);
  }

  function submit() {
    if (!canSubmit) {
      setShowErrors(true);
      return;
    }
    const id = `local-${Date.now()}`;
    const post: Post = {
      id,
      communityId,
      authorId: CURRENT_USER.id,
      title: trimmedTitle,
      type,
      body: type === "text" ? body.trim() || undefined : undefined,
      linkUrl: type === "link" ? linkUrl.trim() : undefined,
      linkDomain: type === "link" ? extractDomain(linkUrl.trim()) : undefined,
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
          <label htmlFor="create-post-community" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
            Community
          </label>
          <select
            id="create-post-community"
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

        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800" role="tablist" aria-label="Post type">
          {(
            [
              ["text", "Text", FileText],
              ["image", "Image", ImageIcon],
              ["link", "Link", Link2],
            ] as [PostType, string, typeof FileText][]
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={type === value}
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
          <label htmlFor="create-post-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
            Title
          </label>
          <input
            id="create-post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="An interesting title"
            aria-invalid={showErrors && !!titleError}
            aria-describedby={showErrors && titleError ? "create-post-title-error" : undefined}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
            <span>
              {showErrors && titleError ? (
                <span id="create-post-title-error" className="text-red-600 dark:text-red-400">{titleError}</span>
              ) : (
                <span>&nbsp;</span>
              )}
            </span>
            <span>{trimmedTitle.length}/{TITLE_MAX}</span>
          </div>
        </div>

        {type === "text" && (
          <div>
            <label htmlFor="create-post-body" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Text <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="create-post-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={BODY_MAX}
              placeholder="What do you want to share?"
              aria-invalid={showErrors && !!bodyError}
              aria-describedby={showErrors && bodyError ? "create-post-body-error" : "create-post-body-count"}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
              <span>
                {showErrors && bodyError ? (
                  <span id="create-post-body-error" className="text-red-600 dark:text-red-400">{bodyError}</span>
                ) : (
                  <span>&nbsp;</span>
                )}
              </span>
              <span id="create-post-body-count">{body.length}/{BODY_MAX}</span>
            </div>
          </div>
        )}

        {type === "link" && (
          <div>
            <label htmlFor="create-post-url" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              URL
            </label>
            <input
              id="create-post-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/article"
              aria-invalid={(showErrors || showLinkError) && !!linkError}
              aria-describedby={(showErrors || showLinkError) && linkError ? "create-post-url-error" : undefined}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {(showErrors || showLinkError) && linkError && (
              <p id="create-post-url-error" className="mt-1 text-[11px] text-red-600 dark:text-red-400">{linkError}</p>
            )}
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
          <Button variant="primary" onClick={submit}>
            Post
          </Button>
        </div>
      </div>
    </Modal>
  );
}

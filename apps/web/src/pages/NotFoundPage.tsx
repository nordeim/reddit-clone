import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <span className="text-5xl" role="img" aria-label="ufo">🛸</span>
      <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
        404 — Page not found
      </h1>
      <p className="text-sm text-zinc-500">
        This page drifted off into space. Let&apos;s get you back home.
      </p>
      <Link to="/">
        <Button variant="primary">Back to Home</Button>
      </Link>
    </div>
  );
}

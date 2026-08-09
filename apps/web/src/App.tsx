import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AppShell } from "./components/layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { CommunityPage } from "./pages/CommunityPage";
import { PostPage } from "./pages/PostPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SearchPage } from "./pages/SearchPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useAppStore } from "./store/store";

export default function App() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    // reducedMotion="user" tells framer-motion to honour the browser's
    // prefers-reduced-motion setting — motion components will animate
    // instantly when the user has reduced motion enabled.
    // Plan §11.6, §14.6.
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/popular" element={<HomePage />} />
            <Route path="/all" element={<HomePage />} />
            <Route path="/explore" element={<HomePage />} />
            <Route path="/r/:name" element={<CommunityPage />} />
            <Route path="/comments/:postId" element={<PostPage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </MotionConfig>
  );
}

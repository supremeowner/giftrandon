import { useEffect, useRef, useState } from "react";
import TabBar, { type TabType } from "@/components/TabBar";
import { OpenInTelegramPage } from "@/components/pages/OpenInTelegramPage";
import { GiftsPage } from "@/components/pages/GiftsPage";
import { LeaderboardPage } from "@/components/pages/LeaderboardPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { useTelegramWebAppContext } from "@/contexts/TelegramWebAppContext";
import { AdaptivityProvider } from "@/hooks/AdaptivityProvider";
import { preloadActionHistory } from "@/lib/actionHistory";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("gifts");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { isTelegramContext, webApp } = useTelegramWebAppContext();
  const baselineHeightRef = useRef(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    const getViewportHeight = () => viewport?.height ?? window.innerHeight;
    baselineHeightRef.current = getViewportHeight();

    const detectKeyboard = () => {
      const currentHeight = getViewportHeight();
      const baseline = baselineHeightRef.current || currentHeight;
      const keyboardOpened = baseline - currentHeight > 120;
      setIsKeyboardVisible((prev) => (prev === keyboardOpened ? prev : keyboardOpened));

      if (!keyboardOpened) {
        const heightDelta = Math.abs(currentHeight - baseline);
        if (currentHeight > baseline || heightDelta < 40) {
          baselineHeightRef.current = currentHeight;
        }
      }
    };

    detectKeyboard();

    viewport?.addEventListener("resize", detectKeyboard);
    window.addEventListener("resize", detectKeyboard);

    return () => {
      viewport?.removeEventListener("resize", detectKeyboard);
      window.removeEventListener("resize", detectKeyboard);
    };
  }, []);

  useEffect(() => {
    if (!isTelegramContext || !webApp?.initData) return;
    void preloadActionHistory(webApp.initData);
  }, [isTelegramContext, webApp?.initData]);

  if (!isTelegramContext) {
    return <OpenInTelegramPage />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case "gifts":
        return <GiftsPage />;
      case "leaderboard":
        return <LeaderboardPage />;
      case "profile":
        return <ProfilePage />;
      default:
        return <GiftsPage />;
    }
  };

  return (
    <AdaptivityProvider>
      <div className="app-container">
        <div className="content-area scroll-smooth scrollbar-hide">
          <div key={activeTab} className="page-transition">
            {renderPage()}
          </div>
        </div>
        {!isKeyboardVisible && <TabBar value={activeTab} onChange={setActiveTab} />}
      </div>
    </AdaptivityProvider>
  );
};

export default Index;

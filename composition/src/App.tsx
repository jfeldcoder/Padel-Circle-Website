import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import TabBar from "./components/TabBar";
import SignIn from "./pages/SignIn";
import Today from "./pages/Today";
import Food from "./pages/Food";
import Train from "./pages/Train";
import Body from "./pages/Body";
import Trends from "./pages/Trends";
import Settings from "./pages/Settings";

function Splash() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <span className="font-display text-2xl font-medium text-ink">Composition</span>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;
  if (!session) return <SignIn />;

  return (
    <div className="min-h-dvh bg-bg">
      <main
        className="max-w-md mx-auto px-6 pt-4 pb-28"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/food" element={<Food />} />
          <Route path="/train" element={<Train />} />
          <Route path="/body" element={<Body />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}

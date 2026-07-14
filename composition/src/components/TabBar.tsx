import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Today" },
  { to: "/food", label: "Food" },
  { to: "/train", label: "Train" },
  { to: "/body", label: "Body" },
  { to: "/trends", label: "Trends" },
];

function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--muted)";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (tab) {
    case "Today":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    case "Food":
      return (
        <svg {...common}>
          <path d="M7 3v7a2 2 0 0 0 2 2v9" />
          <path d="M5 3v4M9 3v4" />
          <path d="M16 3c-1.5 1.5-2 4-2 6 0 1.5 1 2 2 2v10" />
        </svg>
      );
    case "Train":
      return (
        <svg {...common}>
          <path d="M4 9v6M20 9v6" />
          <path d="M7 7v10M17 7v10" />
          <path d="M7 12h10" />
        </svg>
      );
    case "Body":
      return (
        <svg {...common}>
          <circle cx="12" cy="6" r="2.5" />
          <path d="M12 8.5v6M12 14.5l-3 6M12 14.5l3 6M7.5 10.5h9" />
        </svg>
      );
    case "Trends":
      return (
        <svg {...common}>
          <path d="M4 19L9.5 12l4 3.5L20 7" />
          <path d="M15.5 7H20v4.5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto flex">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 transition-colors duration-150"
          >
            {({ isActive }) => (
              <>
                <TabIcon tab={tab.label} active={isActive} />
                <span
                  className={`text-[10px] tracking-wide font-medium ${
                    isActive ? "text-accent" : "text-muted"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

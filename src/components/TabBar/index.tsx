import clsx from "clsx";
import styles from "./index.module.scss";
import giftsIcon from "@/assets/tabbar/Gift.svg";
import leaderboardIcon from "@/assets/tabbar/Earth.svg";
import profileIcon from "@/assets/tabbar/Contacts.Fill.Circle.svg";

export type TabType = "gifts" | "leaderboard" | "profile";

type TabBarItem = {
  id: TabType;
  label: string;
  icon: string;
};

const tabBarItems: TabBarItem[] = [
  { id: "gifts", label: "Подарки", icon: giftsIcon },
  { id: "leaderboard", label: "Рейтинг", icon: leaderboardIcon },
  { id: "profile", label: "Профиль", icon: profileIcon },
];

export default function TabBar(props: { value: TabType; onChange: (tab: TabType) => void }) {
  const { value, onChange } = props;

  const handleTabSelect = (tab: TabType) => {
    onChange(tab);
  };

  return (
    <div className={styles.tabbar} role="navigation" aria-label="Bottom navigation">
      {tabBarItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={clsx(styles.item, item.id === value && styles.active)}
          onClick={() => handleTabSelect(item.id)}
        >
          <img src={item.icon} alt="" aria-hidden="true" className={styles.icon} loading="eager" />
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

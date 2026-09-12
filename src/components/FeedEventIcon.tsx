import { Icon } from "@/components/Icon";
import { FeedEvent } from "@/lib/types";

const ENTITY_ICON: Record<string, string> = {
  account: "account_balance",
  goal: "track_changes",
  budget: "checklist",
  category: "sell",
  user: "manage_accounts",
};

export function FeedEventIcon({
  event,
  size = 18,
}: {
  event: FeedEvent;
  size?: number;
}) {
  if (event.entity === "transaction") {
    return event.positive ? (
      <Icon name="arrow_circle_down" size={size} className="text-good" />
    ) : (
      <Icon name="arrow_circle_up" size={size} className="text-critical" />
    );
  }
  const color = event.action === "deleted" ? "text-critical" : "text-accent";
  return (
    <Icon
      name={ENTITY_ICON[event.entity] || "info"}
      size={size}
      className={color}
    />
  );
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  currency?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  isIncome: boolean;
  date: string;
  note?: string;
  accountId?: string;
  goalId?: string;
  isTransfer?: boolean;
  transferAccountId?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  balance: number;
  createdAt: string;
  color?: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  imageUrl?: string;
  note?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  iconCodePoint?: number;
  createdAt: string;
}

export type FeedEntity =
  "transaction" | "account" | "goal" | "budget" | "category" | "user";

export type FeedAction = "created" | "modified" | "deleted";

export interface FeedEvent {
  id: string;
  entity: FeedEntity;
  action: FeedAction;
  userId: string;
  username: string;
  message: string;
  /** ms since epoch for live events; Date.parse(createdAt/date) for historical ones */
  createdAt: number;
  /** only meaningful for transaction entities: true = income, false = expense */
  positive?: boolean;
}

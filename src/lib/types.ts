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

export type FeedEventType = "transaction" | "goal_created" | "goal_updated";

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  userId: string;
  username: string;
  message: string;
  createdAt: number;
}

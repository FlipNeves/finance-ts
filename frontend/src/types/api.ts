export type TransactionType = 'income' | 'expense';
export type TypeFilter = 'all' | TransactionType;

export interface User {
  _id: string;
  email: string;
  name: string;
  familyId?: string;
  inviteCode?: string;
}

export interface Member {
  _id: string;
  name: string;
  email: string;
}

export interface FamilyDetails {
  _id: string;
  name?: string;
  owner: string;
  familyCode: string;
  bankAccounts: string[];
}

export interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  bankAccount?: string;
  date: string;
  userId?: { name: string };
  isFixed?: boolean;
}

export interface CreateTransactionDTO {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  bankAccount?: string;
  date: Date | string;
  isFixed?: boolean;
}

export interface CreateTransactionResponse {
  alert?: string;
  transaction?: Transaction;
}

export interface BiggestExpense {
  description: string;
  amount: number;
  category: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  fixedExpense: number;
  variableExpense: number;
  balance: number;
  budgetLimit: number;
  previousMonthExpense?: number;
  previousMonthIncome?: number;
  biggestExpense?: BiggestExpense;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
}

export interface EvolutionPoint {
  label: string;
  income: number;
  expense: number;
  balance: number;
}

export interface TopSpendingItem {
  description: string;
  amount: number;
  category: string;
  date?: string;
  userName?: string;
}

export interface TopSpending {
  type: string;
  data: TopSpendingItem[];
}

export interface AccountReport {
  bankAccount: string;
  income: number;
  expense: number;
  balance: number;
}

export interface MemberReport {
  userId: string;
  userName: string;
  income: number;
  expense: number;
  balance: number;
}

export interface DailySpendingPoint {
  date: string;
  amount: number;
  variableAmount?: number;
}

export interface DailySpendingChartPoint {
  date: string;
  label: string;
  actualVariable: number | null;
  actualFixed: number | null;
  projectedVariable: number | null;
  projectedFixed: number | null;
  isFuture: boolean;
  isToday: boolean;
}

export interface UpcomingFixed {
  day: number;
  description: string;
  category: string;
  amount: number;
}

export interface IncomeEvent {
  date: string;
  day: number;
  description: string;
  category: string;
  amount: number;
}

export interface IncomeSummary {
  events: IncomeEvent[];
  upcoming: IncomeEvent[];
  missed: IncomeEvent[];
}

export interface BudgetLimit {
  category: string;
  limit: number;
}

export interface Budget {
  month: number;
  year: number;
  totalLimit: number;
  categoryLimits: BudgetLimit[];
}

export interface SaveBudgetDTO {
  month: number;
  year: number;
  totalLimit: number;
  categoryLimits: BudgetLimit[];
}

export interface TotalAccumulated {
  totalAccumulated: number;
  totalIncome: number;
  totalExpense: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
  icon: string;
}

export interface TransactionsFilter {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
}

export type GoalStatus = 'on-track' | 'off-track' | 'achieved' | 'blocked';

export interface GoalProjection {
  currentAmount: number;
  remaining: number;
  monthlyReserve: number;
  etaMonths: number | null;
  monthsToTarget: number | null;
  status: GoalStatus;
}

export interface Goal {
  _id: string;
  title: string;
  targetAmount: number;
  targetDate?: string | null;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  projection: GoalProjection;
}

export interface CreateGoalDTO {
  title: string;
  targetAmount: number;
  targetDate?: string | null;
  category?: string | null;
}

export interface UpdateGoalDTO extends Partial<CreateGoalDTO> {}

export interface GoalContribution {
  _id: string;
  goalId: string;
  amount: number;
  date: string;
  note?: string | null;
  createdAt: string;
  transactionId?: string | null;
}

export interface CreateContributionDTO {
  amount: number;
  date?: string;
  note?: string | null;
}

export interface ParsedChatTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  date?: string;
  bankAccount?: string;
  confidence: number;
}

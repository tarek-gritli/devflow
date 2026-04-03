interface Tag {
  id: string;
  name: string;
  questions?: number;
  createdAt?: Date;
}

interface Author {
  id: string;
  name: string;
  image: string | null;
}

interface Question {
  id: string;
  title: string;
  content: string;
  tags: Tag[];
  author: Author;
  authorId: string;
  createdAt: Date;
  updatedAt?: Date;
  upvotes: number;
  downvotes: number;
  answers?: number;
  views: number;
}

type ActionResponse<T = null> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: Record<string, string[]>;
  };
  status?: number;
};

type SuccessResponse<T = null> = ActionResponse<T> & { success: true };
type ErrorResponse = ActionResponse<undefined> & { success: false };

type APIErrorResponse = NextResponse<ErrorResponse>;
type APIResponse<T = null> = NextResponse<SuccessResponse<T> | ErrorResponse>;

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface PaginatedSearchParams {
  page?: number;
  pageSize?: number;
  query?: string;
  filter?: string;
  sort?: string;
}

interface Answer {
  id: string;
  author: Author;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  upvotes: number;
  downvotes: number;
  questionId: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  bio?: string;
  image?: string;
  location?: string;
  portfolio?: string;
  reputation?: number;
  createdAt: Date;
}

interface Account {
  id: string;
  userId: string;
  password?: string;
  provider: string;
  providerAccountId?: string;
  name: string;
  image?: string;
}

interface Collection {
  id: string;
  authorId: string;
  author: Author;
  questionId: string;
  question: Question;
}

interface Interaction {
  id: string;
  action: "view" | "upvote" | "downvote" | "bookmark" | "post" | "edit" | "delete" | "search";
  actionTarget: "question" | "answer";
  authorId: string;
  questionId?: string;
  answerId?: string;
}

interface Badges {
  GOLD: number;
  SILVER: number;
  BRONZE: number;
}

interface GlobalSearchedItem {
  id: string;
  type: "question" | "answer" | "user" | "tag";
  title: string;
}

interface Job {
  job_id?: string;
  employer_name?: string;
  employer_logo?: string | undefined;
  employer_website?: string;
  job_employment_type?: string;
  job_title?: string;
  job_description?: string;
  job_apply_link?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
}

interface Country {
  name: {
    common: string;
  };
}

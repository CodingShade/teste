export interface User {
  id: number;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  createdAt: string;
  postsCount?: number;
}

export interface Post {
  id: number;
  content: string;
  imageUrl?: string;
  user: User;
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: number;
  content: string;
  user: User;
  post: Post;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
}

export interface CreateCommentRequest {
  content: string;
  postId: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
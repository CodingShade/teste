import axios from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, Post, User, CreatePostRequest, CreateCommentRequest, Comment, PaginatedResponse } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

export const userService = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  searchUsers: async (name: string): Promise<User[]> => {
    const response = await api.get(`/users/search?name=${name}`);
    return response.data;
  },

  updateProfile: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
};

export const postService = {
  getAllPosts: async (page = 0, size = 10): Promise<PaginatedResponse<Post>> => {
    const response = await api.get(`/posts?page=${page}&size=${size}`);
    return response.data;
  },

  createPost: async (postData: CreatePostRequest): Promise<Post> => {
    const response = await api.post('/posts', postData);
    return response.data;
  },

  getPostById: async (id: number): Promise<Post> => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  getUserPosts: async (userId: number, page = 0, size = 10): Promise<PaginatedResponse<Post>> => {
    const response = await api.get(`/posts/user/${userId}?page=${page}&size=${size}`);
    return response.data;
  },

  updatePost: async (id: number, postData: CreatePostRequest): Promise<Post> => {
    const response = await api.put(`/posts/${id}`, postData);
    return response.data;
  },

  deletePost: async (id: number): Promise<void> => {
    await api.delete(`/posts/${id}`);
  },
};

export const commentService = {
  createComment: async (commentData: CreateCommentRequest): Promise<Comment> => {
    const response = await api.post('/comments', commentData);
    return response.data;
  },

  getPostComments: async (postId: number): Promise<Comment[]> => {
    const response = await api.get(`/comments/post/${postId}`);
    return response.data;
  },

  deleteComment: async (id: number): Promise<void> => {
    await api.delete(`/comments/${id}`);
  },
};

export const likeService = {
  toggleLike: async (postId: number): Promise<boolean> => {
    const response = await api.post(`/likes/toggle/${postId}`);
    return response.data;
  },

  checkLike: async (postId: number): Promise<boolean> => {
    const response = await api.get(`/likes/check/${postId}`);
    return response.data;
  },
};

export default api;
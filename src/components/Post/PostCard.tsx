import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Post } from '../../types';
import { likeService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdate }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const newLikedState = await likeService.toggleLike(post.id);
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Erro ao curtir post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Header do Post */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {post.user.avatarUrl ? (
            <img
              src={post.user.avatarUrl}
              alt={post.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
              {post.user.name}
            </h3>
            <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
          </div>
        </div>
        
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Conteúdo do Post */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Imagem do Post */}
      {post.imageUrl && (
        <div className="px-4 pb-3">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full rounded-lg object-cover max-h-96 cursor-pointer hover:opacity-95 transition-opacity"
          />
        </div>
      )}

      {/* Estatísticas */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{likesCount} curtidas</span>
          <span>{post.commentsCount} comentários</span>
        </div>
      </div>

      {/* Ações */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-around">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isLiked
                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
            } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="font-medium">Curtir</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-all duration-200">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comentar</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-gray-50 transition-all duration-200">
            <Share className="w-5 h-5" />
            <span className="font-medium">Compartilhar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
import React, { useState } from 'react';
import { Image, Send, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services/api';
import { Post } from '../../types';

interface CreatePostProps {
  onPostCreated?: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newPost = await postService.createPost({
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });
      
      setContent('');
      setImageUrl('');
      setShowImageInput(false);
      
      if (onPostCreated) {
        onPostCreated(newPost);
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
      alert('Erro ao criar post. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`O que você está pensando, ${user?.name}?`}
              className="w-full resize-none border-none outline-none text-gray-800 placeholder-gray-500 text-lg"
              rows={3}
              maxLength={1000}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Input de Imagem */}
        {showImageInput && (
          <div className="mb-4">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Cole a URL da imagem aqui..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Preview da Imagem */}
        {imageUrl && (
          <div className="mb-4">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full max-h-64 object-cover rounded-lg"
              onError={() => setImageUrl('')}
            />
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              disabled={isSubmitting}
            >
              <Image className="w-5 h-5" />
              <span>Foto</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {content.length}/1000
            </span>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Publicando...' : 'Publicar'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
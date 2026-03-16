import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, ThumbsUp, Share2, Plus, Image as ImageIcon, Send, X, Search, Filter, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../utils';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Modal } from '../components/Modal';

export const Forum: React.FC = () => {
  const { user, forumPosts, theme, systemSettings } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPost, setNewPost] = useState({ title: '', content: '', image: '' });
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const filteredPosts = forumPosts.filter(post => 
    (post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     post.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Tafadhali ingia ili upost');
      return;
    }
    if (!newPost.title || !newPost.content) {
      toast.error('Tafadhali jaza kichwa na maelezo');
      return;
    }

    try {
      await addDoc(collection(db, 'kuku_forum'), {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || '',
        title: newPost.title,
        content: newPost.content,
        image: newPost.image,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      toast.success('Post imetumwa!');
      setIsAddModalOpen(false);
      setNewPost({ title: '', content: '', image: '' });
    } catch (error) {
      toast.error('Hitilafu imetokea');
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'kuku_forum', postId), {
        likes: isLiked ? arrayRemove(user.id) : arrayUnion(user.id)
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    try {
      const post = forumPosts.find(p => p.id === postId);
      if (!post) return;

      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        text: commentText,
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'kuku_forum', postId), {
        comments: arrayUnion(newComment)
      });
      setCommentText('');
      setCommentingPostId(null);
      toast.success('Maoni yameongezwa');
    } catch (error) {
      toast.error('Hitilafu imetokea');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            Jukwaa la <span className="text-amber-600">Wafugaji</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Uliza, jifunze na shiriki uzoefu wako na wengine.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Plus size={20} /> ANZISHA MJADALA
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Tafuta mada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-amber-500 transition-all font-bold text-sm"
          />
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm"
          >
            {/* Post Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                {post.userAvatar ? (
                  <img src={post.userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <MessageSquare size={24} className="text-slate-400" />
                )}
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white">{post.userName}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(post.createdAt?.seconds * 1000).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>

            {/* Post Content */}
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 leading-tight">{post.title}</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 whitespace-pre-wrap">
              {post.content}
            </p>

            {post.image && (
              <div className="mb-6 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                <img src={post.image} alt="" className="w-full max-h-[400px] object-cover" referrerPolicy="no-referrer" />
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-6 pt-6 border-t border-slate-50 dark:border-slate-800">
              <button 
                onClick={() => handleLike(post.id, post.likes.includes(user?.id || ''))}
                className={cn(
                  "flex items-center gap-2 font-black text-xs transition-colors",
                  post.likes.includes(user?.id || '') ? "text-amber-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <ThumbsUp size={18} fill={post.likes.includes(user?.id || '') ? "currentColor" : "none"} />
                {post.likes.length}
              </button>
              <button 
                onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)}
                className="flex items-center gap-2 font-black text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <MessageCircle size={18} />
                {post.comments.length}
              </button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
              {commentingPostId === post.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 space-y-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-slate-900 dark:text-white">{comment.userName}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{comment.text}</p>
                      </div>
                    ))}
                    
                    <div className="flex gap-2 pt-2">
                      <input 
                        type="text"
                        placeholder="Andika maoni yako..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-amber-500/20"
                      />
                      <button 
                        onClick={() => handleAddComment(post.id)}
                        className="p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Add Post Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Anzisha Mjadala Mpya"
      >
        <form onSubmit={handleCreatePost} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kichwa cha Habari</label>
            <input 
              type="text"
              value={newPost.title}
              onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Mfano: Jinsi ya kuzuia mdondo..."
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Maelezo Kamili</label>
            <textarea 
              value={newPost.content}
              onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Andika maelezo yako hapa..."
              rows={5}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-amber-500 transition-all font-bold text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Link ya Picha (Optional)</label>
            <div className="relative">
              <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                value={newPost.image}
                onChange={(e) => setNewPost(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 transition-all font-bold text-sm"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-amber-100 transition-all active:scale-95"
          >
            TUMA POST
          </button>
        </form>
      </Modal>
    </div>
  );
};

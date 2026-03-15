import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { BookOpen, Search, ChevronRight, Clock, User, Tag, Sparkles } from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'react-hot-toast';

export const AcademyPage: React.FC = () => {
  const { academyPosts, theme } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readingPost, setReadingPost] = useState<any>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    setAiAnswer('');
    try {
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key haipatikani. Tafadhali wasiliana na msimamizi.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Wewe ni mtaalamu wa kilimo, ufugaji na masoko nchini Tanzania. Jibu swali hili kwa Kiswahili fasaha, kwa ufupi na kwa kueleweka: ${aiQuestion}`,
      });
      setAiAnswer(response.text || 'Samahani, nimeshindwa kupata jibu kwa sasa.');
    } catch (error: any) {
      console.error("AI Error:", error);
      toast.error(`Hitilafu: ${error?.message || 'Imeshindwa kuuliza AI.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Zote', icon: '📚' },
    { id: 'livestock', label: 'Ufugaji', icon: '🐄' },
    { id: 'crops', label: 'Kilimo', icon: '🌾' },
    { id: 'marketing', label: 'Masoko', icon: '📈' },
    { id: 'general', label: 'Mengineyo', icon: '💡' }
  ];

  const filteredPosts = academyPosts.filter(post => {
    const matchesCat = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (readingPost) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto pb-20">
        <button 
          onClick={() => setReadingPost(null)}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors"
        >
          <ChevronRight className="rotate-180" size={16} />
          Rudi Nyuma
        </button>
        
        <div className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
          {readingPost.image && (
            <div className="w-full h-64 sm:h-96 relative">
              <img src={readingPost.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          <div className="p-8 sm:p-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                {readingPost.category}
              </span>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Clock size={14} />
                {new Date(readingPost.createdAt?.toDate?.() || readingPost.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              {readingPost.title}
            </h1>
            
            <div className="flex items-center gap-3 mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{readingPost.authorName || 'Mtaalamu'}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mwandishi</p>
              </div>
            </div>
            
            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-p:font-medium prose-p:leading-relaxed">
              {readingPost.content.split('\n').map((paragraph: string, idx: number) => (
                <p key={idx} className="mb-4 text-slate-600 dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[40px] p-8 sm:p-12 text-white mb-10 shadow-xl shadow-emerald-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">Farm Academy</h1>
          <p className="text-emerald-50 text-lg font-medium mb-8">
            Jifunze mbinu bora za ufugaji, kilimo, na masoko kutoka kwa wataalamu. Boresha biashara yako leo.
          </p>
          
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-800" size={20} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tafuta makala..."
              className="w-full bg-white rounded-2xl py-4 pl-12 pr-6 text-emerald-900 font-bold placeholder:text-emerald-800/50 outline-none focus:ring-4 ring-white/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 p-6 sm:p-8 mb-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Uliza Mtaalamu (AI)</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pata majibu ya haraka kuhusu kilimo na ufugaji</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Mfano: Dawa gani inafaa kwa kuku wanaohara?"
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500 transition-all font-bold dark:text-white"
            />
            <button 
              onClick={handleAskAI}
              disabled={isAiLoading || !aiQuestion.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-8 py-4 rounded-2xl font-black transition-all whitespace-nowrap"
            >
              {isAiLoading ? 'INATAFTA...' : 'ULIZA SWALI'}
            </button>
          </div>

          {aiAnswer && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30"
            >
              <div className="prose prose-sm prose-emerald dark:prose-invert max-w-none font-medium">
                {aiAnswer.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 text-slate-700 dark:text-slate-300">{line}</p>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-black transition-all border-2",
              selectedCategory === cat.id 
                ? "bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-400" 
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-200"
            )}
          >
            <span className="text-lg">{cat.icon}</span>
            <span className="text-sm">{cat.label}</span>
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">🔍</div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hakuna Makala</h3>
          <p className="text-slate-500 font-medium">Hatujapata makala yoyote kwa sasa.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              onClick={() => setReadingPost(post)}
              className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm group cursor-pointer hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col"
            >
              {post.image ? (
                <div className="h-48 overflow-hidden relative">
                  <img src={post.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {post.category}
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-5xl relative">
                  📚
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {post.category}
                  </div>
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Clock size={12} />
                  {new Date(post.createdAt?.toDate?.() || post.createdAt).toLocaleDateString()}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 flex-1 font-medium">
                  {post.content}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                      <User size={12} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.authorName || 'Mtaalamu'}</span>
                  </div>
                  <span className="text-emerald-600 flex items-center gap-1 text-xs font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Soma <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

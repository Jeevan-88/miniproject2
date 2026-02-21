import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Heart, 
  Send, 
  Trash2, 
  User, 
  LogOut, 
  Plus, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Post {
  id: number;
  content: string;
  email: string;
  full_name: string;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface UserData {
  id: number;
  email: string;
  role: string;
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    fetchPosts();
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Failed to fetch posts');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, fullName };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Auth failed');

      if (isLogin) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccess('Logged in successfully!');
      } else {
        setSuccess('Registration successful! Check console for mock verification link.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !token) return;

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newPost }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setNewPost('');
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deletePost = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) fetchPosts();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  const likePost = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) fetchPosts();
    } catch (err) {
      console.error('Like failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center text-white">
              <Send size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SocialFlow</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-full">
                  <User size={16} />
                  <span className="text-sm font-medium">{user.email}</span>
                  {user.role === 'ROLE_ADMIN' && <Shield size={14} className="text-indigo-600" />}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="px-4 py-2 bg-[#141414] text-white rounded-full text-sm font-medium hover:bg-black/80 transition-all"
              >
                {isLogin ? 'Join Now' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Sidebar / Auth */}
        <div className="md:col-span-1">
          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div 
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-black/5"
              >
                <h2 className="text-2xl font-bold mb-6 italic serif">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 bg-black/5 rounded-xl border-none focus:ring-2 focus:ring-black/10 transition-all"
                        placeholder="Jeevan Yadav"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-1 block">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-black/5 rounded-xl border-none focus:ring-2 focus:ring-black/10 transition-all"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-1 block">Password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-black/5 rounded-xl border-none focus:ring-2 focus:ring-black/10 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl text-sm">
                      <CheckCircle size={16} />
                      {success}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#141414] text-white rounded-xl font-semibold hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Register')}
                  </button>
                </form>
                <p className="mt-6 text-center text-sm text-black/40">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-black font-semibold hover:underline"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-black/5"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                    <User size={40} />
                  </div>
                  <h2 className="text-xl font-bold">{user.email}</h2>
                  <p className="text-sm text-black/40 mb-6 uppercase tracking-widest font-mono">{user.role}</p>
                  
                  <div className="w-full grid grid-cols-2 gap-4 border-t border-black/5 pt-6">
                    <div>
                      <p className="text-xs font-semibold text-black/40 uppercase">Posts</p>
                      <p className="text-lg font-bold">{posts.filter(p => p.email === user.email).length}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-black/40 uppercase">Likes</p>
                      <p className="text-lg font-bold">0</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feed */}
        <div className="md:col-span-2 space-y-6">
          {user && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
              <form onSubmit={createPost} className="space-y-4">
                <textarea 
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="w-full p-4 bg-black/5 rounded-2xl border-none focus:ring-2 focus:ring-black/10 transition-all resize-none h-24"
                  placeholder="What's on your mind?"
                />
                <div className="flex justify-end">
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-[#141414] text-white rounded-full font-semibold hover:bg-black/80 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Post
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-6">
            {posts.map((post) => (
              <motion.div 
                layout
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-bold">
                      {post.full_name?.[0] || post.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{post.full_name || post.email}</h3>
                      <p className="text-[10px] text-black/40 uppercase tracking-widest font-mono">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {(user?.id === (post as any).user_id || user?.role === 'ROLE_ADMIN') && (
                    <button 
                      onClick={() => deletePost(post.id)}
                      className="p-2 text-black/20 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <p className="text-black/80 leading-relaxed mb-6">
                  {post.content}
                </p>

                <div className="flex items-center gap-6 pt-4 border-t border-black/5">
                  <button 
                    onClick={() => likePost(post.id)}
                    className="flex items-center gap-2 text-sm font-medium text-black/40 hover:text-red-500 transition-colors"
                  >
                    <Heart size={18} className={post.like_count > 0 ? 'fill-red-500 text-red-500' : ''} />
                    {post.like_count}
                  </button>
                  <button className="flex items-center gap-2 text-sm font-medium text-black/40 hover:text-indigo-500 transition-colors">
                    <MessageSquare size={18} />
                    {post.comment_count}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-black/40 text-xs font-mono uppercase tracking-widest">
          <p>© 2026 SocialFlow Backend Project</p>
          <div className="flex gap-6">
            <p>Roll: 27</p>
            <p>Jeevan Yadav</p>
            <p>Reg: 12308799</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
